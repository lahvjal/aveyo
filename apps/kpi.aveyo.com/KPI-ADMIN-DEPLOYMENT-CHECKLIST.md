# KPI Admin - Deployment Checklist

Quick reference checklist for deploying the KPI Formula Admin feature.

## Pre-Deployment

- [ ] All code committed to version control
- [ ] Environment variables configured
- [ ] Supabase project accessible
- [ ] MySQL database accessible
- [ ] Dependencies installed (`npm install`)

## Database Setup

- [ ] Run Supabase migration (`supabase-migrations/create-custom-kpis-table.sql`)
- [ ] Verify table created: `SELECT * FROM custom_kpis LIMIT 1;`
- [ ] Verify RLS enabled: Check in Supabase dashboard
- [ ] Verify indexes created: Check in Supabase dashboard
- [ ] Test public read policy (should work without auth)
- [ ] Test authenticated write policy (requires auth)

## API Endpoints

- [ ] Test `/api/db-schema` - Returns database schema
- [ ] Test `/api/kpis` GET - Returns all KPIs
- [ ] Test `/api/kpis` POST - Creates KPI (requires auth)
- [ ] Test `/api/kpis` PUT - Updates KPI (requires auth)
- [ ] Test `/api/kpis` DELETE - Deletes KPI (requires auth)

## Frontend

- [ ] `/kpis` page loads
- [ ] Authentication prompt appears
- [ ] Can sign in with Supabase
- [ ] Dashboard loads after sign in
- [ ] KPI list displays (built-in + custom)
- [ ] Search functionality works
- [ ] Section filter works
- [ ] Create button works

## KPI Form Modal

- [ ] Modal opens when clicking "Create Custom KPI"
- [ ] All form fields render correctly
- [ ] Formula editor loads
- [ ] @ autocomplete triggers on typing @
- [ ] Field selector displays database fields
- [ ] Can select field and insert token
- [ ] Formula validation runs on change
- [ ] Validation errors display correctly
- [ ] Templates button shows templates
- [ ] Can select and apply template
- [ ] Test button works
- [ ] Test results display
- [ ] Field reference panel toggles
- [ ] Can save KPI
- [ ] Modal closes on save

## Integration

- [ ] Custom KPI appears in dashboard
- [ ] Custom KPI calculates correctly
- [ ] Custom KPI displays in correct section
- [ ] Time period filtering works
- [ ] Goal comparison works (if applicable)
- [ ] Trend indicators work
- [ ] Can edit custom KPI
- [ ] Edits reflect on dashboard
- [ ] Can delete custom KPI
- [ ] Deleted KPI removed from dashboard

## Navigation

- [ ] Database icon appears in header
- [ ] Icon highlights when on `/kpis` page
- [ ] Can navigate to `/kpis` from header
- [ ] Can navigate back to dashboard
- [ ] Sign out button works

## Security

- [ ] Unauthenticated users redirected
- [ ] Cannot access `/kpis` without auth
- [ ] Cannot create KPI without auth
- [ ] Cannot edit KPI without auth
- [ ] Cannot delete KPI without auth
- [ ] SQL injection attempts blocked
- [ ] Dangerous keywords rejected
- [ ] Invalid formulas rejected

## Performance

- [ ] Schema loads in < 500ms
- [ ] KPI list loads in < 1s
- [ ] Simple formulas execute in < 100ms
- [ ] Complex formulas execute in < 500ms
- [ ] Page transitions smooth
- [ ] No console errors
- [ ] No memory leaks

## Documentation

- [ ] README.md updated
- [ ] KPI-FORMULA-ADMIN.md available
- [ ] KPI-ADMIN-SETUP.md available
- [ ] KPI-ADMIN-IMPLEMENTATION-SUMMARY.md available
- [ ] All documentation accurate
- [ ] Examples work as documented

## Production Readiness

- [ ] TypeScript compiles without errors
- [ ] No linting errors
- [ ] All tests pass (if applicable)
- [ ] Build succeeds: `npm run build`
- [ ] Production build runs: `npm start`
- [ ] Environment variables set in production
- [ ] Database migrations applied in production
- [ ] SSL/TLS configured
- [ ] Error monitoring setup (optional)
- [ ] Backup strategy in place

## Post-Deployment

- [ ] Smoke test in production
- [ ] Create first production custom KPI
- [ ] Verify on production dashboard
- [ ] Monitor logs for errors
- [ ] Verify performance metrics
- [ ] User acceptance testing
- [ ] Team training (if applicable)
- [ ] Documentation shared with team

## Rollback Plan

If issues occur:

1. **Database Issue:**
   - Disable custom KPIs: `UPDATE custom_kpis SET is_active = false;`
   - Drop table if needed: `DROP TABLE custom_kpis;`

2. **Application Issue:**
   - Revert to previous deployment
   - Roll back database migration if needed
   - Check logs for error details

3. **Performance Issue:**
   - Disable slow custom KPIs
   - Add database indexes
   - Optimize problematic queries

## Support Contacts

- **Technical Lead:** _________________
- **Database Admin:** _________________
- **DevOps:** _________________

## Notes

_Add any deployment-specific notes here_

---

**Date:** _________________  
**Deployed By:** _________________  
**Version:** 1.0.0  
**Status:** [ ] Ready [ ] In Progress [ ] Complete
