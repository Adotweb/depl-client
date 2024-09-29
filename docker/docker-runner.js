const Docker = require("dockerode");
const fs = require("fs");
const tar = require("tar-fs");
const { add_mapping, get_mapping } = require("../registry/port-mappings");
const { log, delete_logs } = require("../logs/logger");

const docker = new Docker({ socketPath : "/var/run/docker.sock" });



function run_docker_repo(path){


	const tarStream = tar.pack(path);

	let repo_name = path.split("/");
	repo_name = repo_name[repo_name.length - 1];



	return new Promise((resolve, reject) => {


	docker.buildImage(tarStream, {t : repo_name}, (err, stream) => {


		if(err){
			console.log(err);
			return
		}

		docker.modem.followProgress(stream, onFinished, onProgress);

		function onProgress(event){
			console.log(event);
		}

		async function onFinished(err, output){
			if(err){
				console.log(err)
				return 
			}
			
			console.log("docker image built successfully");

			
			let exists = await get_mapping(repo_name);

			if(exists){
				try {
					let container_to_stop = docker.getContainer(exists)
					await delete_logs(repo_name)
					await container_to_stop.stop()
				}catch{}
			}			

			let image_details = await docker.getImage(repo_name).inspect();

			const exposed_ports = image_details.Config.ExposedPorts || {}

			const PortBindings = {};

			for (const port in exposed_ports){
				PortBindings[port] = [{HostPort : ""}]
			}

			let container = await docker.createContainer({
				Image : repo_name,
				Tty : false,
				HostConfig : {
					AutoRemove : true,
					PortBindings
				}
			})
		

			await container.start()

			const container_info = await container.inspect();

			const ports = container_info.NetworkSettings.Ports;

			
			let port_names = Object.keys(ports);

			if(port_names.length == 1){
				let register_port =  ports[port_names[0]][0].HostPort;


				add_mapping(register_port, repo_name, container_info.Id)
			
				docker.getContainer(container_info.Id).logs({
					follow : true, 
					stdout : true, 
					stderr : true
				}, async (err, stream) => {
	
					if(err){
						return log(err, repo_name)
					}
				
					stream.on("data", (chunk)=> {
						log(chunk.toString(), repo_name)
					})
					
					stream.on("end", () => {
						log("logs ended here at " + Date.now(), repo_name)
					})
				})
	
	
				resolve(`port ${register_port} was registered under url ${repo_name}`);
			}

		

			

		}

	})

	})
}


module.exports = {
	run_docker_repo	
}
