const express = require("express");
const bodyParser = require("body-parser")
const fs = require("fs");
// import { format } from "path";
const shell = require("shelljs");
const multipart = require("connect-multiparty");
const { url } = require("inspector");


const multipartMiddleware = multipart();
const app = express();
const port = 8080;
app.use(bodyParser.json());
app.use(
	bodyParser.urlencoded({
		extended: false,
	})
);
const CYCLEGAN_DIR = `${__dirname}/CycleGAN`

const run_model = async (style) => {
	shell.cd(CYCLEGAN_DIR);
	const sh = `bash ./scripts/server/run_${style}.sh`;
	shell.exec(sh);
};


app.post("/api/transfer", multipartMiddleware, async (req, res) => {
	const files = req.files;
	const body = req.body
	let dirty = false
	console.log(files)

	// 清空图片
	if (!dirty) {
		await shell.rm('-rf', ` ${CYCLEGAN_DIR}/dataset_server/*`);
		dirty = true
	}

	// 保存此次图片
	for (let i = 0; i < body.nums; i++) {
		const type = files[i].type.replace('image/', '.')
		try {
			const image = fs.readFileSync(files[i].path)

			fs.writeFileSync(`${CYCLEGAN_DIR}/dataset_server/${i + type}`, image)
		} catch (error) {
			console.log(error)
		}

	}

	// 跑模型
	await run_model(body.style)

	// 拿结果
	const resultDir = `${CYCLEGAN_DIR}/results/style_${body.style}_pretrained/test_latest/images`
	const resImg = []
	for (let i = 0; i < body.nums; i++) {
		const type = files[i].type.replace('image/', '.')
		const image = fs.readFileSync(`${resultDir}/${i}_fake${type}`, "base64")
		const url = `data:image/${type.slice(1)};base64,${image}`
		resImg.push(url)
	}
	// console.log(resImg)

	// 传回给前端
	res.header({
		"Access-Control-Allow-Origin": "*",
	});
	res.json(resImg)
	// res.send(resImg)
	// for (let img of resImg) {
	// 	res.send(img)
	// }
	res.end(() => console.log('connect end ----------------'));
});

app.get("/", (req, res) => res.send("Hello World!"));
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
