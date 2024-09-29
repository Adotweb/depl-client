const { clone_or_pull } = require("./git/git-puller")
const { run_docker_repo } = require("./docker/docker-runner");
const { get_logs } = require("./logs/logger")
const fs = require("fs")
const axios = require("axios")
const bodyParser = require("body-parser")
const express = require("express");


const app = express();


app.use(express.json())
app.use(bodyParser())

app.get("/register/:user/:repo", async (req, res) => {


	let user = req.params.user;
	let repo = req.params.repo;

	if(!user ||!repo){
		return res.send("need both user and repo to register")
	}

	let install_path = await clone_or_pull(user + "/" + repo);

	let message = await run_docker_repo(install_path)

	res.send("deploy successfull")

})

app.get("/logs/:repo_name", async (req, res) => {
	
	let logs = await get_logs(req.params.repo_name);

	res.send(`<body>${logs.replaceAll("\n", "<br>")}</body>`)
})

app.use("/:repo_name", async (req, res) => {

	const {repo_name} = req.params;

	let target_port
	try {
		target_port = fs.readFileSync(__dirname + "/registry/registry-base.txt", "utf8")
		.split("\n")
		.filter(s => s !== "")
		.map(map => map.split(" "))
		.filter(map => map.includes(repo_name))[0][0];

	}catch(e){
		return res.send("no such url registered")
	}

	if(!target_port){
		return res.status(404).send("repo not found")
	}

	const docker_url = `http://localhost:${target_port}${req.path}`
		

	try {
		const response = await axios({
			method : req.method.toLowerCase(),
			url : docker_url,
			params : req.query,
			headers : {
				...req.headers,
				"content-type":null
			},
			data: (req.body)
		})


		res.status(response.status).send(response.data)
	}catch(e){
		if(e.response)	{
			res.status(e.response.status).send(e.response.data)
		}else {
			res.status(500).send("error reaching the docker container")
		}


	}
})




app.listen(5000)
