/*
 * Startwerte für die Materialliste – geschätzter Monatsverbrauch für
 * 3 Reinigungskräfte (Chef + 2 Mitarbeiterinnen) in der Unterhaltsreinigung
 * (Büros, Praxen, Treppenhäuser). Preise: Großhandel, netto, Stand 2026 (ca.).
 * Alles ist in der App änderbar.
 */
const DEFAULT_MATERIALS = [
  { name: 'Müllbeutel 120 L', unit: 'Stück', pack: 'Rolle à 25', monthlyQty: 250, price: 0.18, stock: 0, minStock: 50, note: 'ca. 4,50 € je Rolle' },
  { name: 'Müllbeutel 35 L', unit: 'Stück', pack: 'Rolle à 50', monthlyQty: 600, price: 0.05, stock: 0, minStock: 150, note: 'ca. 2,50 € je Rolle' },
  { name: 'Bio-Müllbeutel 10 L (kompostierbar)', unit: 'Stück', pack: 'Rolle à 50', monthlyQty: 150, price: 0.09, stock: 0, minStock: 50, note: 'ca. 4,50 € je Rolle' },
  { name: 'Glasreiniger', unit: 'Liter', pack: 'Kanister 10 L', monthlyQty: 8, price: 2.2, stock: 0, minStock: 3, note: 'gebrauchsfertig' },
  { name: 'Sanitärreiniger', unit: 'Liter', pack: 'Kanister 10 L', monthlyQty: 6, price: 4.5, stock: 0, minStock: 2, note: 'Konzentrat, sauer' },
  { name: 'Urinsteinentferner', unit: 'Liter', pack: 'Flasche 1 L', monthlyQty: 3, price: 5.5, stock: 0, minStock: 1, note: '' },
  { name: 'Allzweck-/Unterhaltsreiniger', unit: 'Liter', pack: 'Kanister 10 L', monthlyQty: 5, price: 3.0, stock: 0, minStock: 2, note: 'Konzentrat, optional' },
  { name: 'Mikrofasertücher', unit: 'Stück', pack: '10er-Pack', monthlyQty: 10, price: 1.2, stock: 0, minStock: 10, note: 'Ersatz für Verschleiß, optional' },
  { name: 'Einweghandschuhe Nitril', unit: 'Stück', pack: 'Box à 100', monthlyQty: 200, price: 0.06, stock: 0, minStock: 100, note: 'optional' },
  { name: 'Swiffer Staubtücher (Nachfüll)', unit: 'Stück', pack: 'Großpack à 40', monthlyQty: 40, price: 0.25, stock: 0, minStock: 20, note: 'Staubwedel-/Bodentücher' },
  { name: 'Staubsaugerbeutel', unit: 'Stück', pack: '10er-Pack', monthlyQty: 6, price: 1.5, stock: 0, minStock: 5, note: 'passend zum Gerät' },
  { name: 'Wischmopp-Bezüge', unit: 'Stück', pack: 'einzeln', monthlyQty: 2, price: 4.0, stock: 0, minStock: 2, note: 'Ersatz für Verschleiß' },
  { name: 'Schwämme / Pads', unit: 'Stück', pack: '10er-Pack', monthlyQty: 20, price: 0.4, stock: 0, minStock: 10, note: 'optional' },
];
module.exports = { DEFAULT_MATERIALS };
