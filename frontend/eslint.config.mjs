// Flat config ESLint — eslint-config-next v16 fournit déjà les règles
// core-web-vitals + TypeScript et les ignores de build (.next/, out/, …)
import next from "eslint-config-next";

const eslintConfig = [
  ...next,
  {
    rules: {
      // eslint-plugin-react-hooks v7 signale tout setState synchrone dans un effet ;
      // les effets d'initialisation du projet (restauration de session, sync du thème,
      // géolocalisation, reset au changement d'onglet) sont des patterns valides
      // → warning plutôt qu'erreur bloquante pour la CI
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
