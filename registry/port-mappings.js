const fs = require("fs");
const { update_list } = require("../ws/server-connection");

let registry_base_path = __dirname + "/registry-base.txt"

async function get_mapping(url){

	
	let registry_base = fs.readFileSync(registry_base_path, "utf8").split("\n").filter(s => s !== "").map(map => map.split(" "))

	let registered_url_index;


	

	registry_base.forEach(([port, u, id], i) => {

		if(url == u){
			registered_url_index = i;
		}
	})

	

	if(registered_url_index >= 0){


		let id = registry_base[registered_url_index][2]

		registry_base[registered_url_index] = ""

		registry_base = registry_base.filter(s => s != "").map(s => s.join(" ")).join(" ");

		fs.writeFileSync(registry_base_path, registry_base, "utf8")
		
	

		return id


	}


	return false;

}

async function add_mapping(port, url, id){


	let registry_base = fs.readFileSync(registry_base_path, "utf8").split("\n").filter(s => s !== "").map(map => map.split(" "))

	console.log(registry_base)

	let old_list = registry_base.map(s => s[0][1])
	
	let registered_url_index;

	registry_base.forEach(([port, u, id], i) => {

		if(url == u){
			registered_url_index = i;
		}
	})

	
	if(registered_url_index){
		registry_base[registered_url_index] = [port, url, id].join(" ")
		return
	}

	registry_base = registry_base.map(map => map.join(" "))


	registry_base.push([port, url, id].join(" "))
	

	let new_list = registry_base.map(s => s.split(" ")[1])

	fs.writeFileSync(registry_base_path, registry_base.join("\n"), "utf8")


	update_list(old_list, new_list)
}

module.exports = {
	add_mapping,
	get_mapping,
}
