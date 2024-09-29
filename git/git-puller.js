const simple_git = require("simple-git");
const fs = require("fs")
const git = simple_git();


async function clone_or_pull(repo, branch){

	
	let repo_url = "https://github.com/" + repo
	

	let local_name = repo.split("/")[1];


	let install_path = "/home/Alim/Documents/depl-client";
	
	if(!fs.existsSync(install_path)){
		fs.mkdirSync(install_path, {recursive : true})
	}


	if(fs.existsSync(install_path + "/" + local_name)){


		let git = simple_git(install_path + "/" + local_name)

		await git.pull("origin", branch || "master");	

		return install_path + "/" + local_name
	}

	await git.clone(repo_url, install_path + "/" + local_name)

	return install_path + "/" + repo
}

module.exports = {
	clone_or_pull
}
