sign up for free, signs the wallet in but remains on landing
start saving, if not signed, signs in then goes to dashboard, if signed in initially, goes to dashboard
logout button logs you out of dapp and the connected wallet
if user disconnect wallet through the wallet itself, they dont access the dapp, back to landing
if user refreshes page while logges in, they see their page, no redirecting
if user isnt logged in and tries check any page like /chain/..it returns to landing
if user is logged in and goes to a page that doesnt exist, it reurns to error 404 for dashboard
then if not logged in and goes to a page that doesnt exist, it returns to the other eror 404