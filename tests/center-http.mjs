import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = "http://127.0.0.1:3000";
const credentials = await readFile(".local-data/accounts.txt", "utf8");
const passwords = [...credentials.matchAll(/Құпиясөз: (.+)/g)].map((x) => x[1]);
async function login(email, password) {
  const r = await fetch(`${base}/api/center`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ action: "login", email, password }),
  });
  assert.equal(r.status, 200, await r.text());
  return r.headers.get("set-cookie").split(";")[0];
}
const loginPage = await fetch(`${base}/workspace/login`);
assert.equal(loginPage.status, 200);
const loginHtml = await loginPage.text();
assert(loginHtml.includes("login-redesign"));
assert(loginHtml.includes("Жүйеге кіру"));
assert(loginHtml.includes("Құпиясөзді көрсету"));
assert.equal((await fetch(`${base}/api/center`)).status, 401);
const cookie = await login("admin@s7.local", passwords[0]);
const response = await fetch(`${base}/api/center`, {
  headers: { Cookie: cookie },
});
assert.equal(response.status, 200);
const state = await response.json();
assert.equal(state.account.role, "admin");
assert(state.lessons.length >= 1);
console.log("✓ Admin login, session cookie, PostgreSQL API");
for (const section of [
  "",
  "students",
  "groups",
  "team",
  "schedule",
  "attendance",
  "methods",
  "tasks",
  "payments",
  "messages",
  "reports",
  "contracts",
]) {
  const r = await fetch(`${base}/workspace/${section}`, {
    headers: { Cookie: cookie },
  });
  const html = await r.text();
  assert.equal(r.status, 200, `${section} ${html.slice(-500)}`);
  assert(html.includes("S7"));
  assert(
    !html.includes("CRM.Space"),
    "Legacy marketing branding must not leak into the personal CRM",
  );
  assert(!html.includes('"digest":"'), "Server render error");
  console.log(`✓ Render /workspace/${section}`);
}
const cross = await fetch(`${base}/api/center`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "http://evil.example",
    Cookie: cookie,
  },
  body: JSON.stringify({ action: "logout" }),
});
assert.equal(cross.status, 403);
console.log("✓ Cross-origin mutation rejected");
const teacherCookie = await login("teacher@s7.local", passwords[1]);
const teacherResponse = await fetch(`${base}/api/center`, {
  headers: { Cookie: teacherCookie },
});
const teacherState = await teacherResponse.json();
assert.equal(teacherState.account.role, "teacher");
assert.equal(teacherState.charges.length, 0);
assert.equal(teacherState.accounts.length, 1);
const deny = await fetch(`${base}/api/center`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: base,
    Cookie: teacherCookie,
  },
  body: JSON.stringify({ action: "employee" }),
});
assert.equal(deny.status, 403);
const protectedPage = await fetch(`${base}/workspace/team`, {
  headers: { Cookie: teacherCookie },
  redirect: "manual",
});
assert.equal(protectedPage.status, 307);
const deniedLogo = await fetch(`${base}/api/center/brand`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: base,
    Cookie: teacherCookie,
  },
  body: JSON.stringify({ dataUrl: "invalid" }),
});
assert.equal(deniedLogo.status, 403);
const invalidLogo = await fetch(`${base}/api/center/brand`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base, Cookie: cookie },
  body: JSON.stringify({ dataUrl: "data:image/png;base64,PGh0bWw+" }),
});
assert.equal(invalidLogo.status, 400);
const robots = await (await fetch(`${base}/robots.txt`)).text();
assert(robots.includes("Disallow: /"));
console.log(
  "✓ Teacher login, scoped data, admin actions and branding permissions",
);
const contractDenied = await fetch(
  `${base}/api/center/contracts/print?id=missing`,
  { headers: { Cookie: teacherCookie } },
);
assert.equal(contractDenied.status, 403);
const missingContract = await fetch(
  `${base}/api/center/contracts/print?id=missing`,
  { headers: { Cookie: cookie } },
);
assert.equal(missingContract.status, 404);
console.log("✓ Contract print permissions and missing-document handling");
const logout = await fetch(`${base}/api/center`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base, Cookie: cookie },
  body: JSON.stringify({ action: "logout" }),
});
assert.equal(logout.status, 200);
assert(logout.headers.get("set-cookie").includes("s7_session=;"));
console.log("✓ Logout clears session");
console.log("HTTP integration checks passed");
