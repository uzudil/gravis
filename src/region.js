import $ from 'jquery';

export class Region {

	constructor(rx, ry, region) {
		this.rx = rx;
		this.ry = ry;
		this.region = region;
		this.name = "region" + this.rx.toString(16) + this.ry.toString(16);

		this.z = [];
	}

	save() {
		let region = {
			region: this.region,
			version: 1,
			name: this.name,
			x: this.rx,
			y: this.ry
		};

		console.log("Uploading " + this.name + "...");
		$.ajax({
			type: 'POST',
			url: "http://localhost:9090/cgi-bin/upload.py",
			data: "name=" + this.name + "&expanded=0&file=" + JSON.stringify(region),
			success: ()=>{console.log("Success!");},
			error: (error)=>{console.log("error: ", error);},
			dataType: "text/json"
		});
		console.log("Stored on server.");
	}

	static load(rx, ry, onSuccess, onError=null) {
		let name = "/models/regions/region" + rx.toString(16) + ry.toString(16) + ".json?cb=" + window.cb;
		$.ajax({
			type: 'GET',
			dataType: 'json',
			url: name + "?cb=" + window.cb,
			success: (region) => {
				return onSuccess(new Region(rx, ry, region.region));
			},
			error: (err) => {
				if(onError) onError();
			}
		});
	}
}
