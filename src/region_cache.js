import THREE from 'three';
import * as water from 'WaterShader';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';
import * as regionModel from 'region';
import * as sectionDef from 'section';
import { View } from 'view';
import JSZip from 'jszip';

class ExpandedRegion {

	constructor(expandedRegion) {
		this.index = Date.now();
		this.points = [];
		for(let x = 0; x < constants.VERTEX_SIZE; x++) {
			let a = [];
			this.points.push(a);
			for(let y = 0; y < constants.VERTEX_SIZE; y++) {
				a.push({
					z: 0,
					type: 0,
					road: 0,
					beach: 0,
					secondTexture: 0
				});
			}
		}

		let i = 0;
		let x = 0;
		let y = 0;
		while(i < expandedRegion.region.length) {
			let p = this.points[x][y];
			p.z = expandedRegion.region[i++];
			p.type = expandedRegion.region[i++];
			p.road = expandedRegion.region[i++];
			p.beach = expandedRegion.region[i++];
			p.secondTexture = expandedRegion.region[i++];

			y++;
			if(y >= constants.VERTEX_SIZE) {
				y = 0;
				x++;
			}
		}
	}

	touch() {
		this.index = Date.now();
	}
}

const CACHE_SIZE = 12;
export class RegionCache {
	constructor() {
		this.regions = {};
	}

	load(regionX, regionY, onSuccess, index=0) {
		if (index < constants.REGION_OFFSETS.length) {
			// load regions into the view
			let [dx, dy] = constants.REGION_OFFSETS[index];
			let rx = regionX + dx;
			let ry = regionY + dy;
			if (rx < 0) rx += constants.REGION_COUNT;
			if (ry < 0) ry += constants.REGION_COUNT;
			if (rx >= constants.REGION_COUNT - 1) rx -= constants.REGION_COUNT;
			if (ry >= constants.REGION_COUNT - 1) ry -= constants.REGION_COUNT;
			let key = "" + rx + "," + ry;

			if (this.regions[key] == null) {
				this.loadExpandedOrRegularRegion(rx, ry, (expandedRegion) => {
					this.regions[key] = new ExpandedRegion(expandedRegion);
					this.trim();
					console.log("+++ LOADED " + key);
					this.load(regionX, regionY, onSuccess, index + 1);
				}, (region) => {
					console.log("Could not load region " + rx + "," + ry);
				});
			} else {
				console.log("+++ FROM CACHE " + key);
				this.regions[key].touch();
				this.load(regionX, regionY, onSuccess, index + 1);
			}
		} else {
			onSuccess();
		}
	}

	loadExpandedOrRegularRegion(rx, ry, onSuccess, onFailure) {
		let name = "region" + rx.toString(16) + ry.toString(16) + ".json";
		let path = "/models/expanded_regions/" + name + ".zip";
		$.ajax({
			dataType: "binary",
			processData: false,
			responseType: "arraybuffer",
			type: 'GET',
			url: path + "?cb=" + window.cb,
			success: (data) => {
				var new_zip = new JSZip();
				new_zip.loadAsync(data).then(function(zip) {
					new_zip.file(name).async("string").then((expandedRegion) => {
						onSuccess(JSON.parse(expandedRegion));
					});
				});
			},
			error: (err) => {
				regionModel.Region.load(rx, ry, (region) => {
					onFailure(region);
				});
			}
		});
	}

	// remove old regions
	trim() {
		while(Object.keys(this.regions).length > CACHE_SIZE) {
			let keys = Object.keys(this.regions);
			let oldest = keys.reduce((prev, current) => {
				if(!current || !prev || this.regions[current].index < this.regions[prev].index) {
					return current
				} else {
					return prev;
				}
			}, null);
			if(oldest) {
				console.log("+++ TRIMMING index=" + this.regions[oldest].index + " key=" + oldest);
				delete this.regions[oldest];
			}
		}
		console.log("+++ CACHE SIZE is " + Object.keys(this.regions).length);
	}

	get(regionX, regionY, pointX, pointY) {
		try {
			return this.regions["" + regionX + "," + regionY].points[pointX][pointY];
		} catch(exc) {
			debugger;
		}
	}
}