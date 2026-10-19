
function main(config) {
  if (!config || typeof config !== "object") {
    throw new Error("无效的 Mihomo 配置对象");
  }

  const groups = config["proxy-groups"] || [];
  const rules = config["rules"] || [];

  const groupNames = new Set(
    groups.map(group => group.name)
  );

  // 需要存在的策略组
  const requiredGroups = [
    {
      name: "Proxy",
      type: "select",
      proxies: ["DIRECT"]
    },
    {
      name: "Emby",
      type: "select",
      proxies: ["DIRECT", "Proxy"]
    },
    {
      name: "Steam",
      type: "select",
      proxies: ["DIRECT", "Proxy"]
    },
    {
      name: "Others",
      type: "select",
      proxies: ["Proxy", "DIRECT"]
    }
  ];

  for (const group of requiredGroups) {
    if (!groupNames.has(group.name)) {
      groups.push(group);
      groupNames.add(group.name);
    }
  }

  config["proxy-groups"] = groups;

  // GEO 数据库设置
  config["geodata-mode"] = true;
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;

  config["geox-url"] = {
    ...(config["geox-url"] || {}),
    geoip:
      "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip-lite.dat",
    geosite:
      "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat"
  };

  // 自定义分流规则
  const customRules = [
    "GEOIP,private,DIRECT,no-resolve",

    // Emby
    "DOMAIN-SUFFIX,luvme.de5.net,DIRECT",
    "DOMAIN-SUFFIX,biliblili.uk,Emby",
    "DOMAIN-SUFFIX,embyplus.org,Emby",
    "DOMAIN-SUFFIX,chapanda.site,Emby",

    // Steam
    "GEOSITE,steam@cn,DIRECT",
    "GEOSITE,steam,Steam",

    // 
    "GEOSITE,apple,DIRECT",
    "GEOSITE,microsoft,DIRECT",

    // 常见境外服务 IP 分类（依赖数据库支持）
    "GEOIP,telegram,Proxy,no-resolve",
    "GEOIP,google,Proxy,no-resolve",

    // GEO 主规则
    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",
    "GEOSITE,geolocation-!cn,Proxy"
  ];

  // 清理重复的自定义规则
  const customSet = new Set(customRules);
  const filteredRules = rules.filter(
    rule => !customSet.has(rule)
  );

  // 插入到 MATCH 兜底规则之前
  const matchIndex = filteredRules.findIndex(
    rule =>
      typeof rule === "string" &&
      rule.startsWith("MATCH,")
  );

  if (matchIndex >= 0) {
    filteredRules.splice(matchIndex, 0, ...customRules);
  } else {
    filteredRules.push(...customRules);
    filteredRules.push("MATCH,Others");
  }

  config["rules"] = filteredRules;

  return config;
}
