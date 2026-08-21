/* =========================================================
   三地实时天气看板 —— JavaScript 逻辑
   数据来源：和风天气 QWeather 免费开发版
   思路：每个地点先用“城市搜索”接口拿到 LocationID，
        再用“实时天气”接口拿到温度/湿度/风力等数据，
        最后渲染成卡片；每 10 分钟自动刷新一次。
   ========================================================= */


/* ---------- 第 1 部分：配置区（你主要改这里） ---------- */

// 【必填 1】你的和风天气 API Key。
// 获取方法见同目录下的 README.md。
const QWEATHER_KEY="4c6e50e067ee4d23a77cf85e246caf3b";

// 【必填 2】你的专属 API Host。
// 登录和风天气控制台 → 设置，形如 abc1234xyz.def.qweatherapi.com
const QWEATHER_HOST="k45b67edm5.re.qweatherapi.com";

// 和风天气的两个接口地址（使用你的专属 API Host）
// 注意：公共域名 geoapi.qweather.com / devapi.qweather.com 已停止服务，必须用自己的 API Host
const GEO_API     = `https://${QWEATHER_HOST}/geo/v2/city/lookup`; // 城市搜索：把地名转成 LocationID
const WEATHER_API = `https://${QWEATHER_HOST}/v7/weather/now`;     // 实时天气：根据 LocationID 取天气

// 要展示的三个地点。
// keyword：用来搜索的关键字；adm：所属行政区划，帮助精确定位到正确的区县。
const LOCATIONS = [
  { name: "北京市顺义区",         keyword: "顺义", adm: "北京市" },
  { name: "河北省沧州市青县",     keyword: "青县", adm: "河北省" },
  { name: "河北省石家庄市裕华区", keyword: "裕华", adm: "河北省" },
];

// 自动刷新间隔（单位：毫秒）。10 分钟 = 10 × 60秒 × 1000毫秒
const REFRESH_INTERVAL = 10 * 60 * 1000;


/* ---------- 第 2 部分：小工具函数 ---------- */

// 把接口返回的时间 "2026-08-21T14:55+08:00" 简化成 "08-21 14:55"
function formatObsTime(iso) {
  if (!iso) return "未知";
  const datePart = iso.split("T")[0]; // 取 "2026-08-21"
  const timePart = iso.split("T")[1]; // 取 "14:55+08:00"
  return `${datePart.slice(5)} ${timePart.slice(0, 5)}`; // 月-日 + 时:分
}

// 根据天气文字（如“多云”“小雨”）返回对应的 emoji 图标；找不到就给个通用图标
function getWeatherEmoji(text) {
  if (text.includes("晴"))        return "☀️";
  if (text.includes("多云"))      return "⛅";
  if (text.includes("阴"))        return "☁️";
  if (text.includes("雷"))        return "⛈️";
  if (text.includes("雨"))        return "🌧️";
  if (text.includes("雪"))        return "❄️";
  if (text.includes("雾") || text.includes("霾")) return "🌫️";
  if (text.includes("沙") || text.includes("尘")) return "🌪️";
  return "🌡️";
}

// 显示顶部红色错误条
function showErrorBanner(msg) {
  const banner = document.getElementById("error-banner");
  banner.textContent = "⚠️ " + msg;
  banner.classList.remove("hidden"); // 去掉 hidden，让它显示出来
}
// 隐藏顶部错误条
function hideErrorBanner() {
  document.getElementById("error-banner").classList.add("hidden");
}


/* ---------- 第 3 部分：核心——获取单个城市的天气 ---------- */

// async 表示这是一个“异步函数”，内部可以用 await 等待网络请求完成
async function fetchWeatherForLocation(loc) {
  // 前置检查：如果还没填 Key 或 API Host，直接报错，避免发出无效请求
  if (!QWEATHER_KEY || QWEATHER_KEY === "在此处粘贴你的API Key") {
    throw new Error("请先在 script.js 中填写你的 API Key");
  }
  if (!QWEATHER_HOST || QWEATHER_HOST === "在此处粘贴你的API Host") {
    throw new Error("请先在 script.js 中填写你的 API Host");
  }

  // 步骤①：调用城市搜索接口，把“顺义/青县/裕华”变成和风内部的 LocationID
  // encodeURIComponent 用来对中文进行 URL 编码，防止请求出错
  const geoUrl = `${GEO_API}?location=${encodeURIComponent(loc.keyword)}&adm=${encodeURIComponent(loc.adm)}&key=${QWEATHER_KEY}`;
  const geoRes = await fetch(geoUrl);          // 发起网络请求，await 等待返回
  if (!geoRes.ok) throw new Error("城市查询请求失败"); // HTTP 状态码不是 200 就抛错
  const geoData = await geoRes.json();         // 把返回的文本解析成 JS 对象
  // 和风返回 code:"200" 才表示成功；否则或没找到城市都要报错
  if (geoData.code !== "200" || !geoData.location || geoData.location.length === 0) {
    throw new Error("未找到该城市，请检查地名");
  }
  const place = geoData.location[0];           // 取匹配到的第一个结果
  const locationId = place.id;                 // 这就是后面要用的 LocationID

  // 步骤②：用 LocationID 调用实时天气接口
  const weatherUrl = `${WEATHER_API}?location=${locationId}&key=${QWEATHER_KEY}`;
  const weatherRes = await fetch(weatherUrl);
  if (!weatherRes.ok) throw new Error("天气请求失败");
  const weatherData = await weatherRes.json();
  if (weatherData.code !== "200") throw new Error("天气数据异常: " + weatherData.code);

  // 步骤③：从返回数据里取出我们需要的字段，组装成一个干净的对象返回
  const now = weatherData.now;
  return {
    displayName: loc.name,                                  // 我们自定义的显示名
    admName:     `${place.adm1} ${place.adm2}`,             // 如 “北京市 顺义区”
    temp:        now.temp,        // 当前温度（℃）
    feelsLike:   now.feelsLike,   // 体感温度（℃）
    text:        now.text,        // 天气状况文字，如“多云”
    humidity:    now.humidity,    // 相对湿度（%）
    windDir:     now.windDir,     // 风向，如“东南风”
    windScale:   now.windScale,   // 风力等级（级）
    obsTime:     now.obsTime,     // 数据观测时间
  };
}


/* ---------- 第 4 部分：渲染卡片 ---------- */

// 初次创建一张“空卡片”骨架（数据还没回来时显示占位内容）
function createCard(loc) {
  const card = document.createElement("section");
  card.className = "weather-card";
  // 用模板字符串一次性写好卡片内部结构
  card.innerHTML = `
    <h2 class="card-title">${loc.name}</h2>
    <p class="card-sub">${loc.adm}</p>
    <div class="card-body">
      <div class="emoji">⏳</div>
      <div class="temp">--°</div>
      <div class="condition">加载中…</div>
    </div>
    <ul class="details">
      <li>湿度：<span data-field="humidity">--</span></li>
      <li>风力：<span data-field="wind">--</span></li>
      <li>体感：<span data-field="feels">--</span></li>
      <li>更新：<span data-field="obs">--</span></li>
    </ul>
  `;
  return card;
}

// 成功拿到数据后，把数据填进对应卡片里
function updateCard(card, data) {
  // querySelector 在卡片内部查找对应的元素并修改它的内容
  card.querySelector(".emoji").textContent        = getWeatherEmoji(data.text);
  card.querySelector(".temp").textContent          = data.temp + "°";
  card.querySelector(".condition").textContent     = data.text;
  card.querySelector(".card-sub").textContent      = data.admName;
  card.querySelector('[data-field="humidity"]').textContent = data.humidity + "%";
  card.querySelector('[data-field="wind"]').textContent     = `${data.windDir} ${data.windScale}级`;
  card.querySelector('[data-field="feels"]').textContent    = data.feelsLike + "°";
  card.querySelector('[data-field="obs"]').textContent      = formatObsTime(data.obsTime);
  card.classList.remove("card-error"); // 移除可能的错误样式
}

// 某个城市加载失败时，在卡片上显示错误提示
function showCardError(card, msg) {
  card.querySelector(".emoji").textContent     = "⚠️";
  card.querySelector(".temp").textContent       = "!";
  card.querySelector(".condition").textContent  = msg;
  card.classList.add("card-error");            // 加上黄色边框提醒
}


/* ---------- 第 5 部分：初始化 & 定时刷新 ---------- */

// 刷新所有城市的天气（页面加载时调用一次，之后每 10 分钟调用一次）
async function refreshAll() {
  hideErrorBanner(); // 每次刷新先清掉上一次的错误条

  // 取出页面上所有卡片，逐个更新
  const cards = document.querySelectorAll(".weather-card");
  let hasError = false; // 用来记录“是不是至少有一个城市失败了”

  for (const card of cards) {
    const loc = card._loc; // 我们在建卡片时把地点信息挂在了卡片上（见下方 DOMContentLoaded）
    try {
      const data = await fetchWeatherForLocation(loc); // 拉数据
      updateCard(card, data);                          // 成功 → 填数据
    } catch (err) {
      hasError = true;
      showCardError(card, err.message || "加载失败");   // 失败 → 显示错误
    }
  }

  // 更新顶部“最后更新时间”
  document.getElementById("last-update").textContent =
    "最后更新：" + new Date().toLocaleTimeString("zh-CN");

  // 如果个别城市失败，给个总提示（但不影响其它正常卡片）
  if (hasError) {
    showErrorBanner("部分城市数据获取失败，已显示可获取的信息；请检查网络或 API Key 是否正确。");
  }
}

// 等 HTML 文档加载完成后再执行，确保能找到上面的元素
document.addEventListener("DOMContentLoaded", () => {
  // 1) 先为三个地点各创建一张空卡片，放进容器
  const container = document.getElementById("weather-container");
  LOCATIONS.forEach((loc) => {
    const card = createCard(loc);
    card._loc = loc;                 // 把地点信息保存在卡片上，刷新时再用
    container.appendChild(card);     // 把卡片加到页面
  });

  // 2) 立刻拉一次天气数据
  refreshAll();

  // 3) 启动定时器：每 REFRESH_INTERVAL 毫秒自动刷新一次
  setInterval(refreshAll, REFRESH_INTERVAL);

  // 4) 绑定“立即刷新”按钮的点击事件
  document.getElementById("refresh-btn").addEventListener("click", refreshAll);
});
