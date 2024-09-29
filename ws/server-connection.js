const { WebSocket } = require("ws");

require("dotenv").config()
const fs = require("fs");


let ws = new WebSocket(process.env.SERVER_URL);
let is_disconnected = false;


const registry_base_path = __dirname + "/../registry/registry-base.txt"

function filter_by_url(url){

	let registry_base = fs.readFileSync(registry_base_path, "utf8").split("\n").filter(s => s!=="").map(map => map.split(" "));


	return registry_base.filter(s => s[1] == url)[0]
}



function start(){


if(is_disconnected){
	console.log("reconnected")
	ws = new WebSocket(process.env.SERVER_URL);
}

ws.on("open", () => {
	



	ws.send(JSON.stringify({
		type : "server.login",
		server_id : process.env.SERVER_ID,
		server_password : process.env.SERVER_PASSWORD
	}))
	

	if(fs.existsSync(registry_base_path)){

		let registry = fs.readFileSync(registry_base_path, "utf8").split("\n")
			.filter(s => s!="")
			.map(s => s.split(" "));

		ws.send(JSON.stringify({
			type : "server.update.hosts",
			old_list : registry.map(s => s[1]),
			new_list : registry.map(s => s[1])
		}))	

	}


	is_disconnected = false;
})

ws.on("close", () => {

	console.log("connection to relay was disconnected, trying to reconnect");


	is_disconnected = true	

})



ws.on("message", async (proto) => {

	try {

	const msg = JSON.parse(proto.toString())



	if(msg.type == "client.deploy"){
		let { repo, stalled_request_id } = msg;	

		console.log("hello")

		let response = await fetch("http://localhost:5000/register/" + repo);
	
		let response_text = await response.text()

		console.log(response_text)

		ws.send(JSON.stringify({
			type : "server.rest.response",
			response :{
				body : response_text
			},
			stalled_request_id
		}))
	}

	if(msg.type == "client.showlogs"){
		const { host, stalled_request_id } = msg;

		let logs_path = __dirname + "/../logs/" + host + "_log.txt"

		if(fs.existsSync(logs_path)){
			let logs = fs.readFileSync(logs_path, "utf8");
		

			ws.send(JSON.stringify({
				type : "server.rest.response", 
				response : {
					body : "<div>" + logs.replaceAll("\n", "<br>") + "</div>"
				},
				stalled_request_id
			}))
			return
		}
		ws.send(JSON.stringify({
			type : "server.rest.response",
			response : {
				body : "there is no logs for this host " + host
			},
			stalled_request_id
		}))

	}

	if(msg.type == "client.rest.request"){

		const { request_object , stalled_request_id, host } = msg;

		let url = request_object.url;		

		let headers = {};

		for(i = 0; i < request_object.rawHeaders.length; i += 2){
			const key = request_object.rawHeaders.length[i];
			const value = request_object.rawHeaders.length[i + 1]
			headers[key] = value
		}

		let host_url = filter_by_url(host)

		console.log(request_object)

		let response = await fetch("http://localhost:" + host_url[0] + url, {
			headers,
			body : headers["Content-Type"]  ? request_object.body : null,
			method : request_object.method
		}).catch((e) => {

			//fix this when not available
			console.log(e)

			ws.send(JSON.stringify({
				stalled_request_id,
				type : "server.rest.response",
				response : {
					body : "error 404"
				}
			}))
			

		})

		if(response.statusText && response.statusText != "OK"){
			return
		}
		
		let content_type = response.headers.get("Content-Type");
		
		let body;

		if(content_type.includes("application/json")){
			body = await response.json()
		} else if (content_type.includes("text/")){
			body = await response.text()
		} else if (content_type.includes("multipart/")){
			body = await response.formData()
		} else if (content_type.includes("application/octet-stream")){
			body = await response.blob()
		} else {
			body = await response.text()
		}
		
		let response_headers = {};
		response.headers.forEach((value, key) => {
			response_headers[key] = value
		})

		console.log("http://localhost:" + host_url[0] + url, response.statusText)
		ws.send(JSON.stringify({
			stalled_request_id,
			type : "server.rest.response",
			response : {
				body, 
				headers : response_headers,
				status : response.status,
				statusText : response.statusText
			}
		}))
		

	}

	if(msg.type == "client.ws.message"){

		const { host, sender, data } = msg;


		let host_url = filter_by_url(host);
	
		console.log(host_url)

		if(!host_url){
			ws.send(JSON.stringify({
				message : {
					error : "no such host active"
				},
				type : "server.ws.message",
				client_id : sender
			}))
		}

		try {
			let host_ws = new WebSocket(`ws://localhost:${host_url[0]}`)		
		
			host_ws.on("error", () => {

				host_ws.close();
				ws.send(JSON.stringify({
					message : "this host does not serve a websocket: " + host,
					type : "server.ws.message",
					client_id : sender
				}))

			})

			host_ws.on("open", () => {
				host_ws.send(data)
			})	

			host_ws.on("message", msg => {
			
				ws.send(JSON.stringify({
					type : "server.ws.message",
					message : msg,
					client_id : sender
				}))

			})

		}catch{
			console.log("Hello")
			ws.send(JSON.stringify({
				message : "this host does not serve a websocket: " + host,
				type : "server.ws.message",
				client_id : sender
			}))
		}

	}
	}
	catch(e){
		console.log(e)
		console.log("invalid access")
	}

})

}

function update_list(old_list, new_list){

	ws.send(JSON.stringify({
		type : "server.update.hosts",
		old_list,
		new_list
	}))

	console.log("updating hostlist done")
}

//try out connecting for first time 

start();

setInterval(() => {


	if(is_disconnected){

		start()

		return
	}

	ws.send(JSON.stringify({
		type : "keepalive"
	}))
}, 15000)

module.exports = {
	ws,
	update_list
}
