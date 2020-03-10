require("dotenv").config();
const IEXCloudClient = require("node-iex-cloud").IEXCloudClient;
const fetch = require("node-fetch");

const { Client, RichEmbed } = require("discord.js");
const bot = new Client();
const TOKEN_DISCORD = process.env.TOKEN_DISCORD;
const TOKEN_IEX = process.env.TOKEN_IEX;

const iex = new IEXCloudClient(fetch, {
  sandbox: false,
  publishable: TOKEN_IEX,
  version: "stable"
});

const dollarAmount = number =>
  number.toLocaleString("en-US", { style: "currency", currency: "USD" });

const getPercentageChange = (oldNumber, newNumber) => {
  var decreaseValue = oldNumber - newNumber;

  return ((decreaseValue / oldNumber) * 100).toFixed(2);
};

const isEmptyObject = obj =>
  Object.keys(obj).length === 0 && obj.constructor === Object;

bot.login(TOKEN_DISCORD);

bot.on("ready", () => {
  console.info(`Logged in as ${bot.user.tag}!`);
  console.log(TOKEN_IEX);
});

bot.on("message", msg => {
  if (msg.content.startsWith("$")) {
    const symbol = msg.content.split("$")[1].split(" ")[0];
    const commandType = type => msg.content.split(" ")[1] === type;
    if (commandType("info")) {
      iex
        .symbol(symbol)
        .batch()
        .company()
        .ceoCompensation()
        .price()
        .range("1m", 4)
        .then(res => {
          if (res) {
            const ceoCompensation = res["ceo-compensation"];
            const price = dollarAmount(res.price);
            const embed = new RichEmbed()
              .setTitle(res.company.companyName)
              .addField("Sector", res.company.sector, true)
              .addField("Price", price, true)
              .addField("Website", res.company.website, false)

              .setDescription(res.company.description)
              .setFooter(
                `${res.company.address} ${res.company.city}, ${res.company.state} ${res.company.zip} | ${res.company.phone}`
              );

            if (res.company.employees) {
              embed.addField("Employees", res.company.employees, true);
            }

            if (
              ceoCompensation &&
              ceoCompensation.name !== null &&
              ceoCompensation.salary !== null &&
              ceoCompensation.bonus !== null &&
              ceoCompensation.stockAwards !== null &&
              ceoCompensation.optionAwards !== null &&
              ceoCompensation.nonEquityIncentives !== null &&
              ceoCompensation.total !== null
            ) {
              embed
                .addBlankField()
                .addField("CEO", ceoCompensation.name)
                .addField(
                  "Compensation",
                  dollarAmount(ceoCompensation.salary),
                  true
                )
                .addField("Bonus", dollarAmount(ceoCompensation.bonus), true)
                .addField(
                  "Stock Awards",
                  dollarAmount(ceoCompensation.stockAwards),
                  true
                )
                .addField(
                  "Option Awards",
                  dollarAmount(ceoCompensation.optionAwards),
                  true
                )
                .addField(
                  "Non Equity Incentives",
                  dollarAmount(ceoCompensation.nonEquityIncentives),
                  true
                )
                .addField("Total", dollarAmount(ceoCompensation.total), true);
            }
            msg.channel.send(embed);
          }
        });
    } else {
      iex
        .symbol(symbol)
        .batch()
        .company()
        .price()
        .ohlc()

        .range("1m", 4)
        .then(res => {
          const change =
            res.ohlc.open && res.ohlc.open.price !== null
              ? getPercentageChange(res.price, res.ohlc.open.price)
              : null;
          const isNegativeChange = change < 0;
          const changeString = isNegativeChange ? `${change}` : `+${change}`;
          const icon = isNegativeChange ? "📉" : "📈";
          const iconArrow = isNegativeChange ? "🔴" : "🟢";

          if (res) {
            const embed = new RichEmbed()
              .setTitle(
                `${icon} ${res.company.companyName} ${change &&
                  `(${changeString}%)`}`
              )
              .addField("Price", dollarAmount(res.price), true)
              .setTimestamp();
            if (!isEmptyObject(res.ohlc)) {
              if (res.ohlc.open.price !== null) {
                embed.addField("Open", dollarAmount(res.ohlc.open.price), true);
              }

              if (res.ohlc.close.price !== null) {
                embed.addField(
                  "Close",
                  dollarAmount(res.ohlc.close.price),
                  true
                );
              }
              if (res.ohlc.high !== null) {
                embed.addField("High", dollarAmount(res.ohlc.high), true);
              }
              if (res.ohlc.low !== null) {
                embed.addField("Low", dollarAmount(res.ohlc.low), true);
              }
            }

            msg.channel.send(embed);
          }
        });
    }
  }
});
