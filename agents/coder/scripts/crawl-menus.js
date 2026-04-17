import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

/**
 * Ce script récupère les menus de cantine sur les pages concernées.
 * Il parse l'HTML puis génère un module TypeScript exportant tous les menus d'un coup.
 * À lancer manuellement : node scripts/crawl-menus.js
 */

const CANTEENS = [
  {
    id: 'site-principal',
    name: 'Site Principal',
    url: 'https://exemple.fr/menus-cantine.html', // Remplacer par l’URL réelle
  },
  // Ajouter d'autres sites ici
];

function normalize(str) {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function fetchMenus() {
  const menus = {};
  for (const cantine of CANTEENS) {
    const res = await fetch(cantine.url);
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${cantine.url}`);
    const html = await res.text();
    const $ = load(html);
    // Cette partie dépend du DOM cible – synthétique :
    // On s’attend à des balises/jours/semaine et listes de plats

    // Exemple minimaliste (à adapter au vrai HTML !)
    const results = {};
    $(".menu-semaine").each(function () {
      const semaine = $(this).attr("data-semaine");
      const jours = {};
      $(this)
        .find(".jour")
        .each(function () {
          const jour = $(this).attr("data-jour");
          const plats = $(this)
            .find(".plat")
            .map((i, el) => normalize($(el).text()))
            .get();
          const allergenes = $(this)
            .find('.allergene')
            .map((i, el) => normalize($(el).text()))
            .get();
          jours[jour] = { plats, allergenes };
        });
      results[semaine] = jours;
    });
    menus[cantine.id] = {
      name: cantine.name,
      menus: results,
    };
  }
  return menus;
}

(async () => {
  try {
    const menus = await fetchMenus();
    // On génère le module TypeScript (compatible import/export)
    const outFile = path.join(__dirname, '../data/menus.ts');
    const header = '// Fichier généré automatiquement -- ne pas éditer
export const menus = ';
    fs.writeFileSync(outFile, header + JSON.stringify(menus, null, 2));
    console.log('Menus récupérés et enregistrés dans data/menus.ts');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
