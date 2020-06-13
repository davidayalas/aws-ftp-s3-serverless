npm install serverless-s3-sync
npm --prefix ./backend/custom-auth install ./backend/custom-auth
npm --prefix ./backend/login install ./backend/login
npm --prefix ./frontend install ./frontend
sls deploy
node setup
npm run build --prefix ./frontend
sls s3sync