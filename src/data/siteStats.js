// Figures below are a snapshot of the live database (bizpoleproductiondb) taken
// on 19 Oct 2026, floored to a round number. Re-run the counts before updating.
export const STATS = {
  businesses: 10700,       // Company rows (10,726)
  clientCompanies: 5500,   // distinct CompanyID with an order (5,532)
  servicesOrdered: 15000,  // active service lines on orders (15,036)
  servicesCompleted: 3000, // serviceassignment Status = Completed (3,045)
  completedLastMonth: 1100,// services completed in Sep 2026 (1,184)
  states: 28,              // distinct states/UTs of client companies
  districts: 250,          // distinct districts of client companies (254)
  servicesOffered: 120,    // active ServiceMaster rows (122)
  team: 200,               // active employees (205)
  officeCities: 11,        // cities with an active Bizpole franchisee office
};
