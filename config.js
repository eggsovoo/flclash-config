
function main(config) {
  // ===== 需要修改的配置 =====
  // 填写你的机场订阅 URL；留空则使用现有配置中的节点
  const SUBSCRIPTION_URL = "";

  // GEO 数据库及分流规则
  config["geodata-mode"] = true;
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;

  config["geox-url"] = {
    geoip: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.dat",
    geosite: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
    mmdb: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country-lite.mmdb"
  };

  // 确保必要字段存在
  config["proxy-providers"] = config["proxy-providers"] || {};
  config["proxy-groups"] = config["proxy-groups"] || [];
  config["rules"] = config["rules"] || [];

  // 可选：定义机场订阅提供者
  if (SUBSCRIPTION_URL) {
    config["proxy-providers"]["cxy"] = {
      type: "http",
      url: SUBSCRIPTION_URL,
      path: "./providers/cxy.yaml",
      interval: 3600,
      "health-check": {
        enable: true,
        url: "https://www.gstatic.com/generate_204",
        interval: 300
      }
    };
  }

  // 判断是否已经存在策略组
  const groups = config["proxy-groups"];
  const hasGroup = name => groups.some(g => g.name === name);

  // 添加 Proxy 策略组
  if (!hasGroup("Proxy")) {
    const proxyGroup = {
      name: "Proxy",
      type: "select",
      proxies: []
    };

    if (config["proxy-providers"]["cxy"]) {
      proxyGroup.use = ["cxy"];
    } else {
      proxyGroup.proxies = ["DIRECT"];
    }

    groups.push(proxyGroup);
  }

  // 添加 Emby 策略组
  if (!hasGroup("Emby")) {
    groups.push({
      name: "Emby",
      type: "select",
      proxies: ["DIRECT", "Proxy"]
    });
  }

  // 添加 Steam 策略组
  if (!hasGroup("Steam")) {
    groups.push({
      name: "Steam",
      type: "select",
      proxies: ["DIRECT", "Proxy"]
    });
  }

  // 添加 Others 策略组
  if (!hasGroup("Others")) {
    groups.push({
      name: "Others",
      type: "select",
      proxies: ["Proxy", "DIRECT"]
    });
  }

  // GEO 与 Emby / Steam 分流
  const newRules = [
    "GEOIP,private,DIRECT,no-resolve",

    "DOMAIN-SUFFIX,luvme.de5.net,DIRECT",
    "DOMAIN-SUFFIX,biliblili.uk,Emby",
    "DOMAIN-SUFFIX,embyplus.org,Emby",
    "DOMAIN-SUFFIX,chapanda.site,Emby",

    "GEOSITE,steam@cn,DIRECT",
    "GEOSITE,steam,Steam",

    "GEOSITE,apple-cn,DIRECT",

    "GEOIP,telegram,Proxy,no-resolve",
    "GEOIP,google,Proxy,no-resolve",

    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",
    "GEOSITE,geolocation-!cn,Proxy"
  ];

  // 避免重复插入相同规则
  const existingRules = new Set(config.rules);
  const rulesToAdd = newRules.filter(r => !existingRules.has(r));

  // 自定义规则应放在 MATCH 兜底规则之前
  const matchIndex = config.rules.findIndex(
    r => typeof r === "string" && r.startsWith("MATCH,")
  );

  if (matchIndex >= 0) {
    config.rules.splice(matchIndex, 0, ...rulesToAdd);
  } else {
    config.rules.push(...rulesToAdd);
    config.rules.push("MATCH,Others");
  }

  return config;
}
