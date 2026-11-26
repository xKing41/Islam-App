// Minimal-Werkzeug: transkribiert WAV-Dateien (16 kHz, mono, PCM16) mit denselben Parametern wie whisper.rn.
// Aufruf: rtool <modell.bin> [--beam N] [--threads N] [--bestof N] [--tinc T] [--tokens] < liste.txt  -> JSON-Zeilen
#include "whisper.h"
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

static bool read_wav(const std::string &path, std::vector<float> &out) {
  std::ifstream f(path, std::ios::binary);
  if (!f) return false;
  std::vector<char> buf((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
  if (buf.size() < 44) return false;
  // einfache Suche nach dem "data"-Block
  size_t pos = 12;
  while (pos + 8 <= buf.size()) {
    uint32_t size;
    memcpy(&size, &buf[pos + 4], 4);
    if (memcmp(&buf[pos], "data", 4) == 0) {
      size_t n = std::min<size_t>(size, buf.size() - pos - 8) / 2;
      out.resize(n);
      const int16_t *s = reinterpret_cast<const int16_t *>(&buf[pos + 8]);
      for (size_t i = 0; i < n; i++) out[i] = s[i] / 32768.0f;
      return true;
    }
    pos += 8 + size;
  }
  return false;
}

static std::string json_escape(const std::string &s) {
  std::string o;
  for (char c : s) {
    if (c == '"' || c == '\\') { o += '\\'; o += c; }
    else if (c == '\n') o += "\\n";
    else if ((unsigned char)c < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%04x", c); o += b; }
    else o += c;
  }
  return o;
}

int main(int argc, char **argv) {
  if (argc < 2) { fprintf(stderr, "usage\n"); return 1; }
  int beam = -1, threads = 4, bestof = -1;
  float tinc = -1;
  bool with_tokens = false;
  std::string prompt;
  for (int i = 2; i < argc; i++) {
    if (!strcmp(argv[i], "--beam")) beam = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--threads")) threads = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--bestof")) bestof = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--tinc")) tinc = atof(argv[++i]);
    else if (!strcmp(argv[i], "--tokens")) with_tokens = true;
  }
  whisper_log_set([](enum wsp_ggml_log_level, const char *, void *) {}, nullptr);
  auto cparams = whisper_context_default_params();
  cparams.use_gpu = false;
  whisper_context *ctx = whisper_init_from_file_with_params(argv[1], cparams);
  if (!ctx) { fprintf(stderr, "Modell nicht geladen\n"); return 1; }
  std::string line;
  while (std::getline(std::cin, line)) {
    if (line.empty()) continue;
    std::vector<float> pcm;
    if (!read_wav(line, pcm)) { printf("{\"file\":\"%s\",\"error\":true}\n", json_escape(line).c_str()); fflush(stdout); continue; }
    whisper_full_params p = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    p.print_realtime = p.print_progress = p.print_timestamps = p.print_special = false;
    p.n_threads = threads;
    p.translate = false;
    p.language = "ar";
    p.temperature = 0.0f;
    if (tinc >= 0) p.temperature_inc = tinc;
    if (bestof > 0) p.greedy.best_of = bestof;
    if (beam > 0) { p.strategy = WHISPER_SAMPLING_BEAM_SEARCH; p.beam_search.beam_size = beam; }
    p.no_context = true;
    p.single_segment = false;
    if (whisper_full(ctx, p, pcm.data(), (int)pcm.size()) != 0) { printf("{\"file\":\"%s\",\"error\":true}\n", json_escape(line).c_str()); fflush(stdout); continue; }
    std::string text, toks;
    int ns = whisper_full_n_segments(ctx);
    for (int s = 0; s < ns; s++) {
      text += whisper_full_get_segment_text(ctx, s);
      int nt = with_tokens ? whisper_full_n_tokens(ctx, s) : 0;
      for (int t = 0; t < nt; t++) {
        auto d = whisper_full_get_token_data(ctx, s, t);
        if (d.id >= whisper_token_eot(ctx)) continue; // Sonder-Token überspringen
        char b[64];
        snprintf(b, sizeof b, "%s[\"", toks.empty() ? "" : ",");
        toks += b;
        toks += json_escape(whisper_full_get_token_text(ctx, s, t));
        snprintf(b, sizeof b, "\",%.4f]", d.p);
        toks += b;
      }
    }
    printf("{\"file\":\"%s\",\"text\":\"%s\",\"tokens\":[%s]}\n", json_escape(line).c_str(), json_escape(text).c_str(), toks.c_str());
    fflush(stdout);
  }
  whisper_free(ctx);
  return 0;
}
