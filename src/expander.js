import { View } from 'view';
import $ from 'jquery';
import * as constants from 'constants';
import * as util from 'util';
import * as regionModel from 'region';
import * as sectionDef from 'section';

export class Expander {
	constructor(onSuccess) {
		this.view = new View();
		this.rx = 0;
		this.ry = 0;
		this.onSuccess = onSuccess;
	}

	saveAllExpandedRegions() {
		$("#saving-regions").show();
		this.workOnRegion();
	}

	workOnRegion() {
		$("#saving-regions-log").append(".");
		console.log("Saving region " + this.rx + "," + this.ry + "...");
		this.view.reset();
		this.loadRegion();
	}

	loadRegion(index=0) {
		if (index < constants.REGION_OFFSETS.length) {
			// load regions into the view
			let [dx, dy] = constants.REGION_OFFSETS[index];
			if (this.rx + dx >= 0 && this.ry + dy >= 0 && this.rx + dx < constants.REGION_COUNT && this.ry + dy < constants.REGION_COUNT) {
				this.loadExpandedOrRegularRegion(this.rx + dx, this.ry + dy, (expandedRegion) => {
					console.log("COPYing region " + (this.rx + dx) + "," + (this.ry + dy) + " at " + (dx + 1) + "," + (dy + 1));
					this.view.copy(expandedRegion, dx + 1, dy + 1);
					this.loadRegion(index + 1);
				}, (region) => {
					console.log("MAKEing region " + (this.rx + dx) + "," + (this.ry + dy) + " at " + (dx + 1) + "," + (dy + 1));
					this.view.display(region, dx + 1, dy + 1);
					this.loadRegion(index + 1);
				});
			} else {
				this.loadRegion(index + 1);
			}
		} else {
			this.view.finish((x, y, point) => {});
			this.view.save(this.rx, this.ry);
			this.rx++;
			if(this.rx >= constants.REGION_SIZE) {
				this.rx = 0;
				this.ry++;
				if(this.ry >= constants.REGION_SIZE) {
					$("#saving-regions").hide();
					this.onSuccess();
					return;
				}
			}
			this.workOnRegion();
		}
	}

	loadExpandedOrRegularRegion(rx, ry, onSuccess, onFailure) {
		let name = "/models/expanded_regions/region" + rx.toString(16) + ry.toString(16) + ".json";
		$.ajax({
			type: 'GET',
			dataType: 'json',
			url: name + "?cb=" + window.cb,
			success: (expandedRegion) => {
				onSuccess(expandedRegion);
			},
			error: (err) => {
				regionModel.Region.load(rx, ry, (region) => {
					onFailure(region);
				});
			}
		});
	}
}