// Where the confirmation email comes from: the sawdust-tickets Lambda
// (api/index.mjs, deployed by scripts/deploy-api.sh). Empty means the
// feature is switched off and the RSVP form hides the checkbox.
export const TICKETS_API = process.env.VUE_APP_TICKETS_API || ''
export const SITE_URL = 'https://www.sawdustcinema.com'
