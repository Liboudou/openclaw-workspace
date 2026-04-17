// Types partagés pour le projet menus-cantines

export type Allergen = string;

export type Dish = {
  name: string;
  allergens: Allergen[];
  imageUrl?: string; // url image récupérée dynamiquement
};

export type DayMenu = {
  plats: string[];   // label plat brut pour matching images/texte
  allergenes: string[];
  // Si enrichi ultérieurement : plats: Dish[]
};

export type WeekMenu = {
  [jour: string]: DayMenu;
};

export type SiteMenus = {
  name: string;
  menus: {
    [semaine: string]: WeekMenu;
  };
};

export type MenusData = {
  [siteId: string]: SiteMenus;
};
