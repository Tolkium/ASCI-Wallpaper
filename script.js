const root = document.documentElement;

const userSettings = {
	dateformat: "mmddyyyy",
	timeFormat: 12,
	ignoreTooBig: false,
	layout: {
		customMargins: false,
		direction: "vertical", // vertical | horizontal

		hideTimePanel: false,

		position: "right", // left | center | right
		alignment: "top", // top | center | bottom | custom
		order: "time", // time | overview
		audioLocation: "overview", // time | center | overview

		margin: {
			top: undefined,
			bottom: undefined,
			left: undefined,
			right: undefined,
		},
	},
	appearance: {
		background: "#0d1110",
		text: "#e4edea",
		direction: "vertical",
		order: "time",

		audioPosition: "bottom",
		panelAlignment: "top",
	},
	volume: {
		showExtras: true, // bass/mid/treble sliders
		smoothness: 0.2,
		sensitivity: 1,
	},
	ascii: {
		useMediaArt: true,
		defaultImage: "",
		colored: true,
		colorMode: "theme",
		background: false,
		resolution: 50,
		saturation: 1, // 0 = grayscale, 1 = normal, >1 more vivid
	},
	times: [
		{ enabled: true, label: "HOME" },
		{ enabled: true, label: "CET", timezone: 1 },
		{ enabled: true, label: "UTC", timezone: 0 },
		{ enabled: true, label: "PST", timezone: -7 },
		{ enabled: true, label: "JST", timezone: 9 },
	],
	timers: [
		{ enabled: true, label: "", date: "" },
		{ enabled: true, label: "", date: "" },
		{ enabled: true, label: "", date: "" },
		{ enabled: true, label: "", date: "" },
		{ enabled: true, label: "", date: "" },
	],
	systemInfo: {},
	customSystemInfo: {
		enabled: true,
	},
};

const systemInfo = ["hostname", "ip", "os", "kernel", "shell", "cpu", "gpu", "ram", "disk"];
const customSystemInfoValues = 11;

let currentMediaThumbnail = "";
let initialLoad = true;
let startTimestamp = null;
let ASCIIUpdateTimeout = null;

function waitForUptimeElement() {
	const uptimeElement = document.querySelector(".uptime");
	if (!uptimeElement) {
		requestAnimationFrame(waitForUptimeElement);
		return;
	}

	startTimestamp = new Date();

	updateSystem();
	updateAsciiImage();
	initGraphs();

	setInterval(() => {
		uptimeElement.textContent = formatTime(Math.floor((new Date() - startTimestamp) / 1000));
		updateDate();
		updateClocks();
		updateTimers();
		updateDate();
		updateGraphsMock();
	}, 1000);
}

requestAnimationFrame(waitForUptimeElement);

window.wallpaperPropertyListener = {
	applyUserProperties: function (properties) {
		let shouldUpdateAscii = false;
		let shouldUpdateClock = false;
		let shouldUpdateTimer = false;
		let shouldUpdateSystem = false;
		let shouldUpdateLayout = false;

		if (initialLoad === true) {
			systemInfo.forEach((entry) => {
				if (!entry) return;
				userSettings.systemInfo[entry] = properties[entry].value;
			});

			updateSystem();
			updateLayout();
			refreshAsciiPalette();
			initialLoad = false;
		}

		if (properties.textsize) {
			root.style.setProperty("--p", `${properties.textsize.value}pt`);
			shouldUpdateLayout = true;
		}

		if (properties.theme) {
			const theme = properties.theme.value;
			document.documentElement.setAttribute("data-theme", theme);
		}

		const colorKeys = [
			"black",
			"red",
			"green",
			"yellow",
			"blue",
			"magenta",
			"cyan",
			"white",
			"bright-black",
			"bright-red",
			"bright-green",
			"bright-yellow",
			"bright-blue",
			"bright-magenta",
			"bright-cyan",
			"bright-white",
		];

		let paletteChanged = false;

		colorKeys.forEach((key) => {
			if (properties[key]) {
				let [r, g, b] = properties[key].value.split(" ").map(Number);
				r = Math.round(r * 255);
				g = Math.round(g * 255);
				b = Math.round(b * 255);
				document.documentElement.style.setProperty(`--color-${key}`, `rgb(${r},${g},${b})`);
				paletteChanged = true;
			}
		});

		if (properties.hideitoobigiwarning) {
			userSettings.ignoreTooBig = properties.hideitoobigiwarning.value;
			shouldUpdateLayout = true;
		}

		if (properties.backgroundcolor) {
			let [r, g, b] = properties.backgroundcolor.value.split(" ").map(Number);
			r = Math.round(r * 255);
			g = Math.round(g * 255);
			b = Math.round(b * 255);
			document.documentElement.style.setProperty(`--color-bg`, `rgb(${r},${g},${b})`);
		}

		if (properties.textcolor) {
			let [r, g, b] = properties.textcolor.value.split(" ").map(Number);
			r = Math.round(r * 255);
			g = Math.round(g * 255);
			b = Math.round(b * 255);
			document.documentElement.style.setProperty(`--color-fg`, `rgb(${r},${g},${b})`);
		}

		if (properties.artbackgroundcolor) {
			let [r, g, b] = properties.artbackgroundcolor.value.split(" ").map(Number);
			r = Math.round(r * 255);
			g = Math.round(g * 255);
			b = Math.round(b * 255);
			document.documentElement.style.setProperty(`--color-art-value`, `rgb(${r},${g},${b})`);
		}

		if (properties.artbackground) {
			const val = Boolean(properties.artbackground.value);

			userSettings.ascii.background = val;
			if (val === true) {
				document.documentElement.style.setProperty(`--color-art-bg`, `var(--color-art-value)`);
			} else {
				document.documentElement.style.setProperty(`--color-art-bg`, `transparent`);
			}
		}

		if (properties.hidetimepanel) {
			userSettings.layout.hideTimePanel = Boolean(properties.hidetimepanel.value);
			shouldUpdateLayout = true;
			shouldUpdateTimer = true;
		}

		if (properties.layout_direction) {
			userSettings.layout.direction = properties.layout_direction.value;
			shouldUpdateLayout = true;
		}

		if (properties.layout_position) {
			userSettings.layout.position = properties.layout_position.value;
			shouldUpdateLayout = true;
		}

		if (properties.layout_alignment) {
			userSettings.layout.alignment = properties.layout_alignment.value;
			shouldUpdateLayout = true;
		}
		if (properties.layout_vertical_order) {
			userSettings.layout.order = properties.layout_vertical_order.value;
			shouldUpdateLayout = true;
		}

		if (properties.layout_audio_location) {
			userSettings.layout.audioLocation = properties.layout_audio_location.value;
			shouldUpdateLayout = true;
		}

		if (properties.layout_audiopanel) {
			userSettings.appearance.audioPosition = properties.layout_audiopanel.value;
			shouldUpdateLayout = true;
		}

		if (properties.layout_direction) {
			userSettings.appearance.direction = properties.layout_direction.value;
			shouldUpdateLayout = true;
		}

		if (properties.layout_order_vertical) {
			userSettings.appearance.order = properties.layout_order_vertical.value;
			shouldUpdateLayout = true;
		}

		if (properties.layout_panelalignment) {
			userSettings.appearance.panelAlignment = properties.layout_panelalignment.value;
			shouldUpdateLayout = true;
		}

		if (properties.layout_custom_margin) {
			userSettings.layout.customMargins = properties.layout_custom_margin.value;
			shouldUpdateLayout = true;
		}

		if (properties.shiftleft) {
			userSettings.layout.margin.left = properties.shiftleft.value;
			shouldUpdateLayout = true;
		}

		if (properties.shiftright) {
			userSettings.layout.margin.right = properties.shiftright.value;
			shouldUpdateLayout = true;
		}

		if (properties.shifttop) {
			userSettings.layout.margin.top = properties.shifttop.value;
			shouldUpdateLayout = true;
		}

		if (properties.shiftbottom) {
			userSettings.layout.margin.bottom = properties.shiftbottom.value;
			shouldUpdateLayout = true;
		}

		if (properties.ascii_static_color) {
			let [r, g, b] = properties.ascii_static_color.value.split(" ").map(Number);
			r = Math.round(r * 255);
			g = Math.round(g * 255);
			b = Math.round(b * 255);
			document.documentElement.style.setProperty(`--ascii-static-color`, `rgb(${r},${g},${b})`);
		}

		if (properties.theme || paletteChanged) {
			shouldUpdateAscii = true;
		}

		if (properties.timeformat) {
			userSettings.timeFormat = Number(properties.timeformat.value);
			updateDate();
		}

		if (properties.dateformat) {
			userSettings.dateformat = properties.dateformat.value;
			updateDate();
		}

		if (properties.showextras) {
			const value = properties.showextras.value;

			userSettings.volume.showExtras = properties.showextras.value;

			if (sliders) {
				if (value === false) {
					[sliders.bass, sliders.mid, sliders.treble].forEach((slider) => {
						slider.classList.add("hidden");
					});
				} else {
					[sliders.bass, sliders.mid, sliders.treble].forEach((slider) => {
						slider.classList.remove("hidden");
					});
				}
			}
		}
		if (properties.smoothness) userSettings.volume.smoothness = 1 - parseFloat(properties.smoothness.value);
		if (properties.volume_sensitivity) userSettings.volume.sensitivity = parseFloat(properties.volume_sensitivity.value);

		if (properties.usemediaart !== undefined) {
			userSettings.ascii.useMediaArt = properties.usemediaart.value;
			shouldUpdateAscii = true;
		}
		if (properties.defaultimage !== undefined) {
			let val = properties.defaultimage.value;
			if (val && !val.startsWith("file:///") && !val.startsWith("http")) {
				val = "file:///" + val.replace(/\\/g, "/");
			}
			userSettings.ascii.defaultImage = val;
			shouldUpdateAscii = true;
		}
		if (properties.coloredascii !== undefined) {
			userSettings.ascii.colored = properties.coloredascii.value;
			shouldUpdateAscii = true;
		}
		if (properties.asciiresolution !== undefined) {
			userSettings.ascii.resolution = parseInt(properties.asciiresolution.value) - 2;
			shouldUpdateAscii = true;
		}
		if (properties.saturation !== undefined) {
			userSettings.ascii.saturation = parseFloat(properties.saturation.value);
			shouldUpdateAscii = true;
		}
		if (properties.ascii_color_mode) {
			userSettings.ascii.colorMode = properties.ascii_color_mode.value;
			shouldUpdateAscii = true;
		}

		for (let i = 0; i <= 4; i++) {
			const timeProp = properties[`time${i}`];
			if (timeProp) {
				const newVal = timeProp.value;
				const element = document.querySelector(`.time${i}`);
				if (element) {
					element.classList.toggle("hidden", !newVal);
					if (newVal === true) shouldUpdateClock = true;
				}
				userSettings.times[i].enabled = newVal;
			}

			const labelProp = properties[`clabel${i}`];
			if (labelProp) {
				userSettings.times[i].label = labelProp.value;
			}

			const tzProp = properties[`timezone${i}`];
			if (tzProp) {
				userSettings.times[i].timezone = tzProp.value;
			}
		}

		for (let i = 0; i <= 4; i++) {
			const timerProp = properties[`timer${i}`];
			if (timerProp) {
				const newVal = timerProp.value;
				const element = document.querySelector(`.timer${i}`);
				if (element) {
					element.classList.toggle("hidden", !newVal);
					if (newVal === true) shouldUpdateTimer = true;
				}
				userSettings.timers[i].enabled = newVal;
			}

			const labelProp = properties[`tlabel${i}`];
			if (labelProp) {
				userSettings.timers[i].label = labelProp.value;
			}

			const dateProp = properties[`tdate${i}`];
			if (dateProp) {
				userSettings.timers[i].date = dateProp.value;
			}
		}

		systemInfo.forEach((entry) => {
			if (properties[entry]) {
				userSettings.systemInfo[entry] = properties[entry].value;
				shouldUpdateSystem = true;
			}
		});

		for (let i = 1; i <= customSystemInfoValues; i++) {
			const prop = properties[`system_stats_prop-${i}`];
			if (prop) {
				userSettings.customSystemInfo[`prop-${i}`] = prop.value;
				shouldUpdateSystem = true;
			}

			const val = properties[`system_stats_value-${i}`];
			if (val) {
				userSettings.customSystemInfo[`value-${i}`] = val.value;
				shouldUpdateSystem = true;
			}
		}

		if (properties.system_additional_information) {
			userSettings.customSystemInfo.enabled = Boolean(properties.system_additional_information.value);
			shouldUpdateSystem = true;
		}

		if (shouldUpdateAscii) {
			clearTimeout(ASCIIUpdateTimeout);
			ASCIIUpdateTimeout = setTimeout(() => {
				refreshAsciiPalette();
				updateAsciiImageDebounce();
			}, 250);
		}
		if (shouldUpdateClock) updateClocks();
		if (shouldUpdateTimer) updateTimers();
		if (shouldUpdateSystem) updateSystem();
		if (shouldUpdateLayout) updateLayout();
	},
};

function updateLayout() {
	const body = document.querySelector("body");
	const terminal = document.querySelector(".terminal");
	const audioPanel = document.querySelector(".audio-terminal");
	const warningEl = document.querySelector(".too-big-warning");

	const audioTimeJump = document.getElementById("audio-time-jump");
	const audioTerminalJump = document.getElementById("audio-terminal-jump");
	const audioOverviewJump = document.getElementById("audio-overview-jump");

	const timePanelEl = document.querySelector('.time-terminal')

	// ---

	const hideTime = userSettings.layout.hideTimePanel;
	if (hideTime === true) timePanelEl.classList.add('hidden');
	else timePanelEl.classList.remove('hidden');
	

	const isHorizontal = userSettings.layout.direction === "horizontal";
	if (isHorizontal) {
		terminal.classList.remove("vertical");
		terminal.classList.add("horizontal");
	} else {
		terminal.classList.add("vertical");
		terminal.classList.remove("horizontal");
	}

	const position = userSettings.layout.position;
	if (position === "left") {
		body.classList.add("left");
		body.classList.remove("center");
		body.classList.remove("right");
	} else if (position === "center") {
		body.classList.remove("left");
		body.classList.add("center");
		body.classList.remove("right");
	} else {
		body.classList.remove("left");
		body.classList.remove("center");
		body.classList.add("right");
	}

	const alignment = userSettings.layout.alignment;
	if (alignment === "top") {
		terminal.classList.add("top");
		terminal.classList.remove("center");
		terminal.classList.remove("bottom");
	} else if (alignment === "center") {
		terminal.classList.remove("top");
		terminal.classList.add("center");
		terminal.classList.remove("bottom");
	} else {
		terminal.classList.remove("top");
		terminal.classList.remove("center");
		terminal.classList.add("bottom");
	}

	const order = userSettings.layout.order;
	if (order === "overview") {
		terminal.classList.remove("time");
		terminal.classList.add("overview");
	} else {
		terminal.classList.add("time");
		terminal.classList.remove("overview");
	}

	const audioLocation = userSettings.layout.audioLocation;
	if (audioLocation === "time") {
		audioTimeJump.appendChild(audioPanel);
	} else if (audioLocation === "center") {
		audioTerminalJump.appendChild(audioPanel);
	} else {
		audioOverviewJump.appendChild(audioPanel);
	}

	// ---

	const marginEl = document.querySelector("body");
	if (userSettings.layout.customMargins) {
		const margins = userSettings.layout.margin;

		Object.keys(margins).forEach((margin) => {
			const val = parseInt(margins[margin]);
			if (val === null || Number.isNaN(val)) return marginEl.style.setProperty(`padding-${margin}`, "");

			marginEl.style.setProperty(`padding-${margin}`, `${val}px`);
		});
	} else {
		marginEl.style.setProperty("padding", "0", "important");
	}

	if (!userSettings.ignoreTooBig) {
		const isOutX = terminal.scrollWidth > terminal.clientWidth;
		const isOutY = terminal.scrollHeight > terminal.clientHeight;

		if (isOutX || isOutY) warningEl.classList.remove("hidden");
		else warningEl.classList.add("hidden");
	} else warningEl.classList.add("hidden");
}

function updateDate() {
	const element = document.querySelector(".dateDisplay");
	const now = new Date();

	const pad = (n) => n.toString().padStart(2, "0");

	const month = pad(now.getMonth() + 1);
	const day = pad(now.getDate());
	const year = now.getFullYear();

	const hours24 = now.getHours();
	const minutes = pad(now.getMinutes());
	const seconds = pad(now.getSeconds());

	const dateFormat = userSettings.dateformat;
	const timeFormat = userSettings.timeFormat;

	let dateText;

	if (dateFormat === "ddmmyyyy") {
		dateText = `${day}/${month}/${year}`;
	} else if (dateFormat === "mmddyyyy") {
		dateText = `${month}/${day}/${year}`;
	} else if (dateFormat === "yyyymmdd") {
		dateText = `${year}/${month}/${day}`;
	}

	let timeText;

	if (timeFormat === 12) {
		const period = hours24 >= 12 ? "PM" : "AM";
		const hours12 = pad(hours24 % 12 || 12);
		timeText = `${hours12}:${minutes}:${seconds} ${period}`;
	} else {
		timeText = `${pad(hours24)}:${minutes}:${seconds}`;
	}

	element.textContent = `${dateText} ${timeText}`;
}

function updateClocks() {
	const times = ["time0", "time1", "time2", "time3", "time4"];
	const now = new Date();

	times.forEach((time, id) => {
		const element = document.querySelector(`.${time}`);
		if (userSettings.times[id].enabled === false || !element) return;

		let date;
		if (id === 0) {
			date = new Date(now);
		} else {
			const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
			const offsetHours = userSettings.times[id].timezone;
			date = new Date(utc.getTime() + offsetHours * 60 * 60 * 1000);
		}

		const h = date.getHours().toString().padStart(2, "0");
		const m = date.getMinutes().toString().padStart(2, "0");
		const s = date.getSeconds().toString().padStart(2, "0");

		const hour12 = (date.getHours() % 12 || 12).toString().padStart(2, "0");
		const ampm = date.getHours() >= 12 ? "PM" : "AM";

		const time24 = `${h}:${m}:${s}`;
		const time12 = `${hour12}:${m}:${s} ${ampm}`;

		const localYear = now.getFullYear();
		const localMonth = now.getMonth();
		const localDate = now.getDate();

		const targetYear = date.getFullYear();
		const targetMonth = date.getMonth();
		const targetDate = date.getDate();

		let day = "TODAY";
		if (targetYear === localYear && targetMonth === localMonth && targetDate === localDate - 1) {
			day = "YESTERDAY";
		} else if (targetYear === localYear && targetMonth === localMonth && targetDate === localDate + 1) {
			day = "TOMORROW";
		}

		// Time progress and bar allocation
		const totalSeconds = 86400;
		const secondsPassed = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
		const progress = secondsPassed / totalSeconds;
		const percentage = Math.floor(progress * 100);

		const totalBars = 24;

		const morningRatio = 5 / 24;
		const noonRatio = 14 / 24;
		const nightRatio = 5 / 24;

		const rawMorning = totalBars * morningRatio;
		const rawNoon = totalBars * noonRatio;
		const rawNight = totalBars * nightRatio;

		let morningBarsMax = Math.floor(rawMorning);
		let noonBarsMax = Math.floor(rawNoon);
		let nightBarsMax = Math.floor(rawNight);

		let allocated = morningBarsMax + noonBarsMax + nightBarsMax;
		let remaining = totalBars - allocated;

		const remainders = [
			{ segment: "morning", remainder: rawMorning - morningBarsMax },
			{ segment: "noon", remainder: rawNoon - noonBarsMax },
			{ segment: "night", remainder: rawNight - nightBarsMax },
		];

		remainders.sort((a, b) => b.remainder - a.remainder);

		for (let i = 0; i < remaining; i++) {
			if (remainders[i % 3].segment === "morning") morningBarsMax++;
			else if (remainders[i % 3].segment === "noon") noonBarsMax++;
			else nightBarsMax++;
		}

		const filledBars = Math.floor(progress * totalBars);
		const morningBars = Math.min(filledBars, morningBarsMax);
		const noonBars = Math.min(Math.max(filledBars - morningBarsMax, 0), noonBarsMax);
		const nightBars = Math.min(Math.max(filledBars - morningBarsMax - noonBarsMax, 0), nightBarsMax);

		element.querySelector(".label").textContent = `[${userSettings.times[id].label}]`;
		element.querySelector(".day").textContent = day;
		element.querySelector(".time24").textContent = time24;
		element.querySelector(".time12").textContent = time12;

		element.querySelector(".morning").textContent = "|".repeat(morningBars);
		element.querySelector(".noon").textContent = "|".repeat(noonBars);
		element.querySelector(".night").textContent = "|".repeat(nightBars);
		element.querySelector(".percentage").textContent = `${percentage}%`;
	});
}

function updateTimers() {
	if (userSettings.layout.hideTimePanel === true) return;

	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const msInDay = 1000 * 60 * 60 * 24;

	userSettings.timers.forEach((timer, index) => {
		if (!timer.enabled) return;

		const element = document.querySelector(`.timer${index}`);
		if (!element) return;

		const parts = timer.date.split("/").map((x) => Number(x.trim()));
		let targetDate;
		let hasYear = parts.length === 3;

		if (hasYear) {
			const [day, month, year] = parts;
			if (isNaN(day) || isNaN(month) || isNaN(year)) {
				showInvalid(element, timer.label);
				return;
			}
			targetDate = new Date(year, month - 1, day);
		} else if (parts.length === 2) {
			const [day, month] = parts;
			if (isNaN(day) || isNaN(month)) {
				showInvalid(element, timer.label);
				return;
			}
			targetDate = new Date(today.getFullYear(), month - 1, day);
			if (targetDate < today) {
				targetDate.setFullYear(targetDate.getFullYear() + 1);
			}
		} else {
			showInvalid(element, timer.label);
			return;
		}

		if (isNaN(targetDate.getTime())) {
			showInvalid(element, timer.label);
			return;
		}

		const diff = Math.round((targetDate - today) / msInDay);

		let typeText = "";
		let dayText = "";
		let daysClass = "";

		if (!hasYear) {
			typeText = "[COUNT_REP]";
		} else if (diff > 0) {
			typeText = "[COUNT_DOWN]";
		} else {
			typeText = "[COUNT_UP]";
		}

		if (diff > 1) {
			dayText = `${diff} DAYS LEFT`;
			daysClass = "ansi-red";
		} else if (diff === 1) {
			dayText = "1 DAY LEFT";
			daysClass = "ansi-bright-red";
		} else if (diff === 0) {
			dayText = "TODAY";
			daysClass = "ansi-cyan";
		} else {
			dayText = `${Math.abs(diff)} DAYS AGO`;
			daysClass = "ansi-green";
		}

		element.querySelector(".type").textContent = typeText;
		element.querySelector(".label").textContent = `[${timer.label}]`;

		const daysElement = element.querySelector(".days");
		daysElement.textContent = dayText;

		daysElement.classList.remove("ansi-red", "ansi-bright-red", "ansi-cyan", "ansi-green");
		daysElement.classList.add(daysClass);
	});
}

function showInvalid(element, label) {
	element.querySelector(".type").textContent = "[INVALID]";
	element.querySelector(".label").textContent = `[${label}]`;
	element.querySelector(".days").textContent = "";
}

function updateSystem() {
	Object.keys(userSettings.systemInfo).forEach((entry) => {
		document.querySelector(`.${entry}`).textContent = userSettings.systemInfo[entry];
	});

	for (let i = 1; i <= customSystemInfoValues; i++) {
		if (
			(!userSettings.customSystemInfo[`prop-${i}`] && !userSettings.customSystemInfo[`value-${i}`]) ||
			userSettings.customSystemInfo.enabled === false
		) {
			document.querySelector(`.custom-prop-${i}`).innerHTML = "&nbsp;";
			document.querySelector(`.custom-value-${i}`).innerHTML = "&nbsp;";
		} else {
			document.querySelector(`.custom-prop-${i}`).textContent = userSettings.customSystemInfo[`prop-${i}`];
			document.querySelector(`.custom-value-${i}`).textContent = userSettings.customSystemInfo[`value-${i}`];
		}
	}

	document.querySelector(".resolution").textContent = `${document.body.scrollWidth}x${document.body.scrollHeight}`;
}

/* #region Audio */
const getSmoothness = () => userSettings.volume.smoothness;
const getSensitivity = () => userSettings.volume.sensitivity;
const maxGreen = 15;
const maxYellow = 10;
const maxRed = 5;
const totalBars = maxGreen + maxYellow + maxRed;

const smoothed = {
	volume: 0,
	bass: 0,
	mid: 0,
	treble: 0,
};

let sliders = null;

function waitForSliders() {
	const volume = document.querySelector(".slider.volume");
	const bass = document.querySelector(".slider.bass");
	const mid = document.querySelector(".slider.mid");
	const treble = document.querySelector(".slider.treble");

	if (volume && bass && mid && treble) {
		sliders = { volume, bass, mid, treble };
	} else {
		requestAnimationFrame(waitForSliders);
	}
}
waitForSliders();

function registerWallpaperListener(registerFnName, handler) {
	const registerFn = window[registerFnName];
	if (typeof registerFn !== "function") return false;

	registerFn(handler);
	return true;
}

const wallpaperHookNames = [
	"wallpaperRegisterAudioListener",
	"wallpaperRegisterMediaPropertiesListener",
	"wallpaperRegisterMediaTimelineListener",
	"wallpaperRegisterMediaPlaybackListener",
	"wallpaperRegisterMediaThumbnailListener",
];

function hasWallpaperEngineHooks() {
	return wallpaperHookNames.some((name) => typeof window[name] === "function");
}

function applyWebModeFallbacks() {
	if (hasWallpaperEngineHooks()) return;

	if (!document.querySelector(".terminal")) {
		requestAnimationFrame(applyWebModeFallbacks);
		return;
	}

	initialLoad = false;
	updateLayout();
	refreshAsciiPalette();
	updateDate();
	updateClocks();
	updateTimers();
	updateSystem();

	const setAudioDefaults = () => {
		if (!sliders) return;
		updateSliderVisual(sliders.bass, 0);
		updateSliderVisual(sliders.mid, 0);
		updateSliderVisual(sliders.treble, 0);
		updateSliderVisual(sliders.volume, 0);
	};

	setAudioDefaults();
	if (!sliders) requestAnimationFrame(setAudioDefaults);

	document.querySelector(".playing-song .status").textContent = "Idle:";
	document.querySelector(".playing-song .text").textContent = "";
	document.querySelector(".currentTime").textContent = formatTime(0);
	document.querySelector(".playing-song .time").textContent = `[${formatTime(0)}/${formatTime(0)}]`;
	document.querySelector(".seekbar").textContent = buildSeekbar(0, 0);
}

function updateSliderVisual(slider, percent) {
	if (!slider) return;

	percent = Math.max(0, Math.min(percent, 100));

	const activeBars = Math.round((percent / 100) * totalBars);
	const greenBars = Math.min(activeBars, maxGreen);
	const yellowBars = Math.min(Math.max(activeBars - maxGreen, 0), maxYellow);
	const redBars = Math.min(Math.max(activeBars - maxGreen - maxYellow, 0), maxRed);

	slider.querySelector(".ansi-green").textContent = "|".repeat(greenBars).padEnd(maxGreen, " ");
	slider.querySelector(".ansi-yellow").textContent = "|".repeat(yellowBars).padEnd(maxYellow, " ");
	slider.querySelector(".ansi-red").textContent = "|".repeat(redBars).padEnd(maxRed, " ");
	slider.querySelector(".ansi-bright-black").textContent = `${percent}%`;
}

// audio listener
function wallpaperAudioListener(audioArray) {
	if (!sliders) return;

	const len = audioArray.length;
	const third = Math.floor(len / 3);

	const bassArray = audioArray.slice(0, third);
	const midArray = audioArray.slice(third, 2 * third);
	const trebleArray = audioArray.slice(2 * third);

	let maxBass = Math.max(...bassArray);
	let maxMid = Math.max(...midArray);
	let maxTreble = Math.max(...trebleArray);
	let maxVolume = Math.max(...audioArray);

	const SENS = getSensitivity();

	maxBass = maxBass * SENS;
	maxMid = maxMid * SENS;
	maxTreble = maxTreble * SENS;
	maxVolume = maxVolume * SENS;

	const SMOOTHING = getSmoothness();

	smoothed.bass = smoothed.bass * (1 - SMOOTHING) + maxBass * SMOOTHING;
	smoothed.mid = smoothed.mid * (1 - SMOOTHING) + maxMid * SMOOTHING;
	smoothed.treble = smoothed.treble * (1 - SMOOTHING) + maxTreble * SMOOTHING;
	smoothed.volume = smoothed.volume * (1 - SMOOTHING) + maxVolume * SMOOTHING;

	if (userSettings.volume.showExtras) {
		updateSliderVisual(sliders.bass, Math.floor(smoothed.bass * 100));
		updateSliderVisual(sliders.mid, Math.floor(smoothed.mid * 100));
		updateSliderVisual(sliders.treble, Math.floor(smoothed.treble * 100));
	}

	updateSliderVisual(sliders.volume, Math.floor(smoothed.volume * 100));
}

registerWallpaperListener("wallpaperRegisterAudioListener", wallpaperAudioListener);
/* #endregion */

/* #region Media */

function wallpaperMediaPropertiesListener(event) {
	const title = event.title;
	const artist = event.artist;
	const album = event.albumTitle;

	document.querySelector(".currentTitle").textContent = title;
	document.querySelector(".currentArtist").textContent = artist;
	document.querySelector(".currentAlbum").textContent = album;

	document.querySelector(".playing-song .text").textContent = artist || title ? `${artist} - ${title}` : "";
}

registerWallpaperListener("wallpaperRegisterMediaPropertiesListener", wallpaperMediaPropertiesListener);

const BAR_LEN = 100;
function buildSeekbar(position, duration) {
	if (!Number.isFinite(duration) || duration <= 0) {
		return ">".padEnd(BAR_LEN, "-");
	}

	const ratio = Math.max(0, Math.min(1, position / duration));
	const idx = Math.round(ratio * (BAR_LEN - 1));

	const left = "=".repeat(idx);
	const right = "-".repeat(BAR_LEN - 1 - idx);

	return left + ">" + right;
}

function wallpaperMediaTimelineListener(event) {
	const duration = event.duration;
	const position = event.position;

	document.querySelector(".currentTime").textContent = formatTime(position);
	document.querySelector(".playing-song .time").textContent = `[${formatTime(position)}/${formatTime(duration)}]`;

	document.querySelector(".seekbar").textContent = buildSeekbar(position, duration);
}

registerWallpaperListener("wallpaperRegisterMediaTimelineListener", wallpaperMediaTimelineListener);

function wallpaperMediaPlaybackListener(event) {
	const element = document.querySelector(".playing-song .status");

	const PLAYBACK_PLAYING = window.wallpaperMediaIntegration?.PLAYBACK_PLAYING ?? 1;

	if (event.state !== PLAYBACK_PLAYING) {
		element.textContent = "Idle:";
	} else {
		element.textContent = "Playing:";
	}
}
registerWallpaperListener("wallpaperRegisterMediaPlaybackListener", wallpaperMediaPlaybackListener);

function wallpaperMediaThumbnailListener(event) {
	currentMediaThumbnail = event.thumbnail || "";

	if (userSettings.ascii.useMediaArt) {
		if (currentMediaThumbnail) {
			updateAsciiImageDebounce(currentMediaThumbnail || userSettings.ascii.defaultImage || "default.png");
		} else {
			updateAsciiImageDebounce(userSettings.ascii.defaultImage || "default.png");
		}
	} else {
		updateAsciiImageDebounce(userSettings.ascii.defaultImage || "default.png");
	}
}

function updateAsciiImage(source = null) {
	const image = new Image();
	image.crossOrigin = "Anonymous";

	let imageSrc = source;

	if (!imageSrc) {
		if (userSettings.ascii.useMediaArt && currentMediaThumbnail) {
			imageSrc = currentMediaThumbnail || userSettings.ascii.defaultImage;
		} else if (userSettings.ascii.defaultImage) {
			imageSrc = userSettings.ascii.defaultImage;
		} else {
			imageSrc = "default.png";
		}
	}

	image.src = imageSrc;

	image.onload = () => {
		const scale = Math.min(48 / userSettings.ascii.resolution, 1);
		document.documentElement.style.setProperty("--ascii-font-size", `calc(var(--p) * ${scale})`);

		const asciiHTML = imageToAscii(image, {
			resolution: userSettings.ascii.resolution,
			useColor: userSettings.ascii.colored,
			saturation: userSettings.ascii.saturation,
			colorMode: userSettings.ascii.colorMode,
		});

		document.querySelector(".image pre.ascii").innerHTML = asciiHTML;
	};

	image.onerror = () => {
		if (userSettings.ascii.defaultImage && imageSrc !== userSettings.ascii.defaultImage) {
			updateAsciiImageDebounce(userSettings.ascii.defaultImage);
		} else if (imageSrc !== "default.png") {
			updateAsciiImageDebounce("default.png");
		} else {
			document.querySelector(".image pre.ascii").innerHTML = "[ Failed to Load Image ]";
		}
	};
}

registerWallpaperListener("wallpaperRegisterMediaThumbnailListener", wallpaperMediaThumbnailListener);

requestAnimationFrame(applyWebModeFallbacks);

/* #endregion */

/* #region IMG to ASCII */
const asciiChars = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];

let cachedAsciiPalette = [];

function buildAsciiPalette() {
	const style = getComputedStyle(document.documentElement);
	return [
		style.getPropertyValue("--color-black").trim(),
		style.getPropertyValue("--color-red").trim(),
		style.getPropertyValue("--color-green").trim(),
		style.getPropertyValue("--color-yellow").trim(),
		style.getPropertyValue("--color-blue").trim(),
		style.getPropertyValue("--color-magenta").trim(),
		style.getPropertyValue("--color-cyan").trim(),
		style.getPropertyValue("--color-white").trim(),
		style.getPropertyValue("--color-bright-black").trim(),
		style.getPropertyValue("--color-bright-red").trim(),
		style.getPropertyValue("--color-bright-green").trim(),
		style.getPropertyValue("--color-bright-yellow").trim(),
		style.getPropertyValue("--color-bright-blue").trim(),
		style.getPropertyValue("--color-bright-magenta").trim(),
		style.getPropertyValue("--color-bright-cyan").trim(),
		style.getPropertyValue("--color-bright-white").trim(),
	];
}

function refreshAsciiPalette() {
	cachedAsciiPalette = buildAsciiPalette();
}

function getBrightness(r, g, b) {
	return 0.299 * r + 0.587 * g + 0.114 * b; // luminance formula
}

function closestColor(r, g, b) {
	let minDist = Infinity;
	let chosenIndex = 0;

	cachedAsciiPalette.forEach((hex, i) => {
		let color = hex;
		if (color.startsWith("rgb")) {
			const nums = color.match(/\d+/g).map(Number);
			color = (nums[0] << 16) + (nums[1] << 8) + nums[2];
		} else {
			color = parseInt(color.replace("#", ""), 16);
		}
		const cr = (color >> 16) & 255;
		const cg = (color >> 8) & 255;
		const cb = color & 255;

		const dist = (cr - r) ** 2 + (cg - g) ** 2 + (cb - b) ** 2;
		if (dist < minDist) {
			minDist = dist;
			chosenIndex = i;
		}
	});

	// Return the CSS variable, not raw color
	return `var(--color-${getTerminalColorName(chosenIndex)})`;
}

function getTerminalColorName(index) {
	const names = [
		"black",
		"red",
		"green",
		"yellow",
		"blue",
		"magenta",
		"cyan",
		"white",
		"bright-black",
		"bright-red",
		"bright-green",
		"bright-yellow",
		"bright-blue",
		"bright-magenta",
		"bright-cyan",
		"bright-white",
	];
	return names[index];
}

function imageToAscii(img, settings = {}) {
	const { resolution = 50, useColor = false, saturation = 1, colorMode = "theme" } = settings;

	const resolutionHeight = Math.floor(resolution / 2);
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");

	canvas.width = resolution;
	canvas.height = resolutionHeight;

	ctx.drawImage(img, 0, 0, resolution, resolutionHeight);
	const data = ctx.getImageData(0, 0, resolution, resolutionHeight).data;

	let output = "";
	for (let y = 0; y < resolutionHeight; y++) {
		for (let x = 0; x < resolution; x++) {
			const i = (y * resolution + x) * 4;
			let r = data[i];
			let g = data[i + 1];
			let b = data[i + 2];

			const gray = 0.299 * r + 0.587 * g + 0.114 * b;
			r = Math.min(255, Math.max(0, gray + (r - gray) * saturation));
			g = Math.min(255, Math.max(0, gray + (g - gray) * saturation));
			b = Math.min(255, Math.max(0, gray + (b - gray) * saturation));

			const brightness = getBrightness(r, g, b);
			const char = asciiChars[Math.floor((brightness / 255) * (asciiChars.length - 1))];

			if (useColor) {
				const color = colorMode === "image" ? `rgb(${r | 0}, ${g | 0}, ${b | 0})` : closestColor(r, g, b);
				output += `<span style="color: ${color}">${char}</span>`;
			} else {
				output += char;
			}
		}
		output += "\n";
	}

	return output;
}

/* #endregion */

function formatTime(totalSeconds) {
	if (isNaN(totalSeconds) || totalSeconds < 0) {
		return "00:00";
	}

	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const padDouble = (num) => String(num).padStart(2, "0");

	let timeStr = "";

	if (days > 0) {
		timeStr += `${days}:`;
	}
	if (days > 0 || hours > 0) {
		timeStr += `${padDouble(hours)}:`;
	}
	timeStr += `${padDouble(minutes)}:${padDouble(seconds)}`;

	return timeStr;
}

function getRGB(input) {
	return input.split(" ").map((v) => Math.floor(parseFloat(v) * 255));
}

function debounce(fn, delay = 100) {
	let timer;
	return function (...args) {
		clearTimeout(timer);
		timer = setTimeout(() => fn.apply(this, args), delay);
	};
}

const updateAsciiImageDebounce = debounce(updateAsciiImage, 150);

/* #region ASCII GRAPHS (MOCK DATA) */
const graphConfig = {
	height: 10, // plot height (rows)
	maxSamples: 1200, // keep extra so wider terminals can still fill the full width
	minPanelWidth: 18,
	maxPanelWidth: 34,
};

const graphState = {
	cpu: [],
	ram: [],
	gpu: [],
};

const graphLast = {
	cpu: 0,
	ram: 0,
	gpu: 0,
};

function clamp01(v) {
	return Math.max(0, Math.min(1, v));
}

function initGraphs() {
	// Pre-fill with zeros so graphs start with empty lines
	graphState.cpu = new Array(graphConfig.maxSamples).fill(0);
	graphState.ram = new Array(graphConfig.maxSamples).fill(0);
	graphState.gpu = new Array(graphConfig.maxSamples).fill(0);

	renderStockGraph("cpu", "CPU", ".cpu-graph");
	renderStockGraph("ram", "RAM", ".ram-graph");
	renderStockGraph("gpu", "GPU", ".gpu-graph");
	updateTerminalScale();
}

function pushGraphSample(key, value) {
	const arr = graphState[key];
	if (!arr) return;

	arr.push(clamp01(value));
	if (arr.length > graphConfig.maxSamples) {
		arr.shift();
	}
}

function parsePx(value) {
	const n = Number.parseFloat(String(value).replace("px", ""));
	return Number.isFinite(n) ? n : 0;
}

function measureCharWidthPx(el) {
	const style = getComputedStyle(el);
	const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) return 10;

	ctx.font = font;
	// "M" is a good approximation for monospace width
	const w = ctx.measureText("M").width;
	return w > 0 ? w : 10;
}

function getPanelWidthForElement(preEl) {
	const charW = measureCharWidthPx(preEl);
	const plotAreaChars = Math.floor(preEl.clientWidth / charW);

	// structure: "100%│" + (panelW + 1 + panelW + 1 + panelW) + "│"
	// i.e. labelWidth(4) + leftBorder(1) + panels + separators(2) + rightBorder(1)
	const labelWidth = 4;
	const borders = labelWidth + 1 + 2 + 1;
	const availableInner = Math.max(0, plotAreaChars - borders);

	const rawPanel = Math.floor((availableInner - 2) / 3); // -2 for 2 internal separators
	return Math.max(graphConfig.minPanelWidth, Math.min(graphConfig.maxPanelWidth, rawPanel));
}

function getTailResampled(arr, desiredLen) {
	if (!arr || desiredLen <= 0) return [];
	if (arr.length <= desiredLen) return arr.slice(arr.length - desiredLen);

	const out = [];
	const start = arr.length - desiredLen;
	for (let i = 0; i < desiredLen; i++) {
		out.push(arr[start + i]);
	}
	return out;
}

function drawPanelRow(values, rowFromTop, height, ramp, gridOnRow) {
	let s = "";
	for (let i = 0; i < values.length; i++) {
		const v = values[i] ?? 0;
		const filled = v * (height - 1);
		const rowFromBottom = height - 1 - rowFromTop;

		if (rowFromBottom > filled) {
			s += gridOnRow ? "-" : " ";
			continue;
		}

		// denser shading near the bottom
		const t = filled <= 0 ? 0 : rowFromBottom / Math.max(filled, 1);
		const idx = Math.max(0, Math.min(ramp.length - 1, Math.floor(t * (ramp.length - 1))));
		s += ramp[idx];
	}
	return s;
}

function padOrTrim(text, len) {
	const t = String(text);
	if (t.length === len) return t;
	if (t.length < len) return t + " ".repeat(len - t.length);
	return t.slice(0, len);
}

function renderStockGraph(key, label, selector) {
	const pre = document.querySelector(selector);
	if (!pre) return;

	const height = graphConfig.height;
	const charW = measureCharWidthPx(pre);
	const totalChars = Math.max(graphConfig.minPanelWidth, Math.floor(pre.clientWidth / Math.max(charW, 1)));

	const values = getTailResampled(graphState[key], totalChars);
	const lines = [];

	for (let row = 0; row < height; row++) {
		let line = "";
		for (let col = 0; col < totalChars; col++) {
			const v = values[col] ?? 0;
			const filled = v * (height - 1);
			const rowFromBottom = height - 1 - row;

			line += rowFromBottom <= filled ? "█" : " ";
		}

		lines.push(line);
	}

	pre.textContent = lines.join("\n");
}

function renderSystemGraph(selector) {
	const pre = document.querySelector(selector);
	if (!pre) return;

	const height = graphConfig.height;
	const panelW = getPanelWidthForElement(pre);

	const cpu = getTailResampled(graphState.cpu, panelW);
	const ram = getTailResampled(graphState.ram, panelW);
	const gpu = getTailResampled(graphState.gpu, panelW);

	// ramps (ASCII only, dense at bottom)
	const cpuRamp = ".:-=+*#%@";
	const ramRamp = ".,:;!~+*#";
	const gpuRamp = " .:-=+*#%@".trimStart();

	const labelWidth = 4;
	const lines = [];

	const cpuPct = `${Math.round(clamp01(graphLast.cpu) * 100)}%`;
	const ramPct = `${Math.round(clamp01(graphLast.ram) * 100)}%`;
	const gpuPct = `${Math.round(clamp01(graphLast.gpu) * 100)}%`;

	const topCpu = padOrTrim(` CPU ${cpuPct} `, panelW);
	const topRam = padOrTrim(` RAM ${ramPct} `, panelW);
	const topGpu = padOrTrim(` GPU ${gpuPct} `, panelW);

	// professional top border with titles per panel
	lines.push(
		" ".repeat(labelWidth) +
			"┌" +
			topCpu.replace(/ /g, "─") +
			"┬" +
			topRam.replace(/ /g, "─") +
			"┬" +
			topGpu.replace(/ /g, "─") +
			"┐"
	);
	// title text line inside the box (keeps borders, looks clean)
	lines.push(
		" ".repeat(labelWidth) + "│" + topCpu + "│" + topRam + "│" + topGpu + "│"
	);

	for (let row = 0; row < height; row++) {
		const yValue = Math.round(((height - 1 - row) / (height - 1)) * 100);
		let yLabel = "    ";
		const gridRow = yValue % 25 === 0;
		if (gridRow) yLabel = String(yValue).padStart(3, " ") + "%";

		const cpuRow = drawPanelRow(cpu, row, height, cpuRamp, gridRow);
		const ramRow = drawPanelRow(ram, row, height, ramRamp, gridRow);
		const gpuRow = drawPanelRow(gpu, row, height, gpuRamp, gridRow);

		lines.push(yLabel + "│" + cpuRow + "│" + ramRow + "│" + gpuRow + "│");
	}

	lines.push(
		" ".repeat(labelWidth) +
			"└" +
			"─".repeat(panelW) +
			"┴" +
			"─".repeat(panelW) +
			"┴" +
			"─".repeat(panelW) +
			"┘"
	);

	// X-axis hints (no extra vertical size beyond 1 line)
	const leftText = "0s";
	const rightText = "time →";
	const totalInner = panelW * 3 + 2;
	let axis = " ".repeat(labelWidth + 1) + leftText;
	const innerSpace = totalInner - leftText.length - rightText.length;
	if (innerSpace > 0) axis += " ".repeat(innerSpace) + rightText;
	lines.push(axis);

	pre.textContent = lines.join("\n");
}

function updateTerminalScale() {
	const terminal = document.querySelector(".terminal");
	if (!terminal) return;

	// Reset scale to measure accurately
	document.documentElement.style.setProperty("--terminal-scale", "1");

	const wRatio = terminal.clientWidth > 0 ? terminal.clientWidth / terminal.scrollWidth : 1;
	const hRatio = terminal.clientHeight > 0 ? terminal.clientHeight / terminal.scrollHeight : 1;

	const scale = Math.max(0.5, Math.min(1, wRatio, hRatio));
	document.documentElement.style.setProperty("--terminal-scale", String(scale));
}

function updateGraphsMock() {
	if (!startTimestamp) return;

	const t = (new Date() - startTimestamp) / 1000;

	// Mock CPU: wavy pattern with noise
	let cpuVal = 0.5 + 0.4 * Math.sin(t / 5) + (Math.random() - 0.5) * 0.1;
	// Mock RAM: slower, smaller wave
	let ramVal = 0.4 + 0.2 * Math.sin(t / 15 + 1.5) + (Math.random() - 0.5) * 0.05;
	// Mock GPU: more bursty pattern
	let gpuVal = 0.3 + 0.6 * Math.abs(Math.sin(t / 3)) + (Math.random() - 0.5) * 0.15;

	cpuVal = clamp01(cpuVal);
	ramVal = clamp01(ramVal);
	gpuVal = clamp01(gpuVal);

	graphLast.cpu = cpuVal;
	graphLast.ram = ramVal;
	graphLast.gpu = gpuVal;

	pushGraphSample("cpu", cpuVal);
	pushGraphSample("ram", ramVal);
	pushGraphSample("gpu", gpuVal);

	renderStockGraph("cpu", "CPU", ".cpu-graph");
	renderStockGraph("ram", "RAM", ".ram-graph");
	renderStockGraph("gpu", "GPU", ".gpu-graph");
	updateTerminalScale();
}
/* #endregion */
