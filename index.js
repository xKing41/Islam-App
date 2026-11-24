// Einstiegspunkt der App.
// Die Hintergrund-Aufgabe (Erinnerungen neu planen) muss VOR dem Router registriert werden,
// damit Android sie auch findet, wenn die App gar nicht geöffnet ist.
import './src/lib/background';
import 'expo-router/entry';
