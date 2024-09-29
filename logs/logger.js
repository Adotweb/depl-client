const fs = require("fs");
const stripAnsi = require("strip-ansi");


async function get_logs(repo){
	
	let logpath = __dirname + "/" + repo + "_log.txt"

	return fs.readFileSync(logpath, "utf-8")
}

async function log(text, repo){


	let logpath = __dirname + "/" + repo + "_log.txt"
	let logs = ""


	text = text.replace(/[^a-zA-Z0-9\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/g, "")

	if(fs.existsSync(logpath)){
		
		logs = fs.readFileSync(logpath, "utf-8")
	} else {
		fs.writeFileSync(logpath, "", "utf-8")
	}


	logs += "\n" + text;

	fs.writeFileSync(logpath, logs, "utf-8")
}


async function delete_logs(repo){


	let logpath = __dirname + "/" + repo + "_log.txt"

	if(!fs.existsSync(logpath)){
		return
	}

	fs.rmSync(logpath);;

}

module.exports = {
	log,
	delete_logs,
	get_logs
}
