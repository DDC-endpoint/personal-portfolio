// JSON for a <script> tag: "<" escaped so the data can never close it.
export const ldJson = (data) => JSON.stringify(data).replace(/</g, "\\u003c");
