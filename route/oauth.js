const express = require("express");
const { URL } = require("url");
const fetch = require("node-fetch");

const Site = require("../schemas/site");
const bodyParser = require("body-parser");

const route = express.Router();

const mountSite = (req, res, next) => {
  req.log("Mounting site");
  Site.findById(req.params.id).exec((err, site) => {
    if (err || !site) {
      res.status(404).json({ err: "Site does not exist" });
    } else {
      req.site = site;
      next();
    }
  });
};

const doFetch = (body) => (req, res) => {
  req.log("Fetching tokens from", req.site.domain);
  let f = fetch(`https://${req.site.domain}/oauth/grant`, {
    method: "POST",
    body: body(req),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-AUTH-SERVER": process.env.domain,
    },
  });

  f.then((resp) => {
    return resp.json();
  }).then((j) => {
    if (
      j &&
      j["oauth_error"] &&
      j["oauth_error"] === "Invalid `client_id` or `client_secret`"
    ) {
      req.log("Domain rejected tokens", j, req.site);
      Site.findOneAndDelete({ _id: req.site._id }).exec();
    }
    req.log("Sending results");
    res.json(j);
  });

  f.catch((e) => res.status(500).json({ err: e }));
};

route.get("/:id", mountSite, (req, res) => {
  let url = new URL(`https://${req.site.domain}/oauth/authorize`);
  url.searchParams.append("client_id", req.site.clientID);
  url.searchParams.append(
    "redirect_uri",
    `https://${process.env.DOMAIN}/auth/${req.params.id}/callback`
  );
  url.searchParams.append(
    "scope",
    "identity,create,read,update,delete,vote,guildmaster"
  );
  url.searchParams.append("permanent", "true");
  url.searchParams.append("state", req.query.state);

  req.log("Redirecting user to", req.site);

  res.redirect(url.toString());
});

route.get(
  "/:id/callback",
  mountSite,
  doFetch((req) => {
    req.log("Submitting token");
    return `code=${req.query.code}&client_id=${req.site.clientID}&client_secret=${req.site.clientSecret}&grant_type=code`;
  })
);

route.post(
  "/:id/refresh",
  mountSite,
  bodyParser.urlencoded({ extended: true }),
  doFetch((req) => {
    req.log("Refreshing tokens");
    return `refresh_token=${req.body.refresh_token}&client_id=${req.site.clientID}&client_secret=${req.site.clientSecret}&grant_type=refresh`;
  })
);

module.exports = route;
