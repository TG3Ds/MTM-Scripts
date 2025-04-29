# TG3D Tampermonkey Script Repository 🛠️

This repository is used for storing and managing Tampermonkey userscripts.

## Development and Maintenance Guidelines

1.  **Adding a Script:**
    * Create a new, meaningfully named directory.
    * Create a `script.user.js` file within that directory.
    * Write the script code and include the necessary Userscript Header.

2.  **Required Metadata (Userscript Header):**
    * `@name`: Readable name of the script.
    * `@namespace`: Usually a company or team identifier.
    * `@version`: **Very important!** The version number **must** be incremented with each update.
    * `@description`: Brief description of the script's functionality.
    * `@author`: Developer/Maintainer.
    * `@match`: Which URLs the script should run on.
    * `@updateURL`: **URL pointing to the raw file of this script**, used for automatic update checks. Format: `https://raw.githubusercontent.com/[user]/[repository]/[branch]/scripts/[script-directory-name]/script.user.js`
    * `@downloadURL`: Usually the same as `@updateURL`.
    * `@grant`: Declare required permissions (e.g., `GM_xmlhttpRequest`, `none`).

## Notes

* Ensure the paths in `@updateURL` and `@downloadURL` **exactly match** the actual file location, otherwise automatic updates will fail.
* When modifying an existing script, **you must update the `@version`**.
