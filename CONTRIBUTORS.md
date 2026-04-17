# Contributors

ChainCircle exists because of the people who built it. This file credits contributions that aren't always visible in `git log` — particularly early work whose commits were rewritten during later refactors.

## Core Contributors

### Mayor Isaac (`isaacogunyileka@gmail.com`)

Built the initial frontend scaffold and the bulk of the early UI before Web3 integration rewrote the layer on top. Specifically:

- Initial frontend setup — project scaffolding, base components (`PurpleBtn`, `TransBtn`, `Spinner`), Layout, asset pipeline
- Dashboard initial UI — `DashboardTable` and surrounding views
- Full Profile module — `ProfileDetails`, `CircleHistory`, `LinkedWallets`, `NotificationSettings`, `PayoutPreferences`, `StatsArchive`, `AccountAction`, `CountUp`
- Circle creation flow — `CreateCircleModal`, `Circle` route, Home page edits

These commits were later consolidated during the Web3 integration pass, so authorship in `git log` shows the integrator. The underlying component architecture and UI skeletons that still ship today are Mayor Isaac's work.

### winsznx (`timjosh507@gmail.com`)

Web3 integration, smart contracts, Push Chain wiring, ongoing maintenance, and the post-hackathon refactor that produced this codebase.

---

## Contributing

New contributors: open a PR against `main`. Please use the `Co-Authored-By:` trailer when pair-programming or integrating someone else's work so credit survives refactors:

```
Co-Authored-By: Name <email@example.com>
```

See [README.md](README.md#contributing) for the full contribution guide.
