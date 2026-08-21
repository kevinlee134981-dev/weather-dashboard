# 四地实时天气看板

一个纯前端（HTML + CSS + JavaScript）的小网页，实时显示以下四个地点的天气：
- 河北省三河市（福禄寿酒店）
- 辽宁省铁岭市（白塔 / 圆通寺塔）
- 河北省沧州市（铁狮子）
- 河北省承德市（避暑山庄）

页面以一行四张卡片展示，并配有各城市地标插画；窄屏时可横向滚动查看。

天气数据来自 **和风天气 QWeather 免费开发版**（温度、天气状况、湿度、风力风向、体感温度等），
页面加载时自动获取并展示，之后每 10 分钟自动刷新，并带有网络错误提示。

---

## 文件结构

```
三地天气预报/
├── index.html    # 页面结构（标题、卡片容器、错误条、刷新按钮）
├── style.css     # 页面样式（背景、卡片布局、颜色）
├── script.js     # 核心逻辑（请求天气接口、渲染卡片、定时刷新）
├── images/       # 城市地标插画（sanhe.png / tieling.png / cangzhou.png / chengde.png）
└── README.md     # 本说明文件
```

---

## 第一步：免费获取和风天气 API Key

1. 打开和风天气开发者平台：https://dev.qweather.com/
2. 注册账号并登录。
3. 进入「控制台」→ 创建项目 → 选择 **免费订阅**（免费版已包含“实时天气”和“城市搜索”）。
4. 在项目中「创建 Key」，类型选 **Web API**，复制生成的 Key（一串字母数字）。

> 免费版每天有一定调用额度，三个城市每 10 分钟刷新一次完全够用。

## 第二步：获取你的专属 API Host

**非常重要！** 和风天气的公共域名（`geoapi.qweather.com`、`devapi.qweather.com`）已在 2026 年陆续停止服务，现在必须改用**每个账号独立的 API Host**。

获取方法：
1. 登录和风天气控制台。
2. 点击左侧「设置」。
3. 找到 **API Host**，它看起来像这样：`abc1234xyz.def.qweatherapi.com`。
4. 点击复制。

## 第三步：把 Key 和 Host 填进代码

打开 `script.js`，找到最上方的配置区，把两处占位文字替换成你自己的：

```js
// 改前
const QWEATHER_KEY  = "在此处粘贴你的API Key";
const QWEATHER_HOST = "在此处粘贴你的API Host";

// 改后（举例）
const QWEATHER_KEY  = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
const QWEATHER_HOST = "abc1234xyz.def.qweatherapi.com";
```

## 第四步：运行网页

**方式 A（最简单）：** 直接双击 `index.html` 用浏览器打开即可。

**方式 B（推荐，避免个别浏览器对本地文件的跨域限制）：** 用本地小服务器打开。
在本文件夹下打开终端，执行：

```bash
# 如果你装了 Python（任选其一）
python -m http.server 8000
# 然后浏览器访问 http://localhost:8000

# 或者装了 Node 的话
npx serve
```

> 提示：
> - 如果页面一直显示“加载中”或报“城市查询请求失败”，请检查 **API Key** 和 **API Host** 是否都填对了。
> - 如果报错涉及 CORS / 跨域，说明你是双击 `index.html` 打开的，请改用方式 B 的本地服务器。

---

## 想改显示的城市？

打开 `script.js`，修改 `LOCATIONS` 数组即可。每个地点需要：
- `name`：你想在卡片上显示的名字
- `keyword`：用来搜索的关键字（区县名，如“三河”“铁岭”）
- `adm`：所属行政区划（如“河北省”“辽宁省”），用来精确定位
- `image`：城市地标图片的相对路径（如 `images/xxx.png`）

例如想加“上海市浦东新区”：
```js
{ name: "上海市浦东新区", keyword: "浦东", adm: "上海市", image: "images/shanghai.png" },
```

然后记得把对应的图片文件上传到 `images/` 文件夹。

## 想改刷新频率？

打开 `script.js`，修改：
```js
const REFRESH_INTERVAL = 10 * 60 * 1000; // 当前为 10 分钟，单位是毫秒
```
比如改成 5 分钟就是 `5 * 60 * 1000`。
