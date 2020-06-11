sls deploy
sls info | grep GET -m 1 | awk -F[/:] '{printf "const endpoint={get(){return '\''https://"$4"/demo/'\'';}};export default endpoint;"}' > frontend/src/assets/js/endpoint.js
cd frontend && npm run build
cd ..
sls s3sync
