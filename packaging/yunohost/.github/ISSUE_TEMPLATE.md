---
name: Bug report
about: When creating a bug report, please use the following template to provide all the relevant information and help debugging efficiently.
---

**How to post a meaningful bug report**

1. _Read this whole template first._
2. _Determine if you are on the right place:_
   - _If you were performing an action on the app from the webadmin or the CLI (install, update, backup, restore, change_url...), you are on the right place!_
   - _Otherwise, the issue may be due to the app itself. Refer to its documentation or repository for help._
   - _When in doubt, post here and we will figure it out together._
3. _Delete the italic comments as you write over them below, and remove this guide._

---

### Describe the bug

_A clear and concise description of what the bug is._

### Context

- Hardware: _VPS bought online / Old laptop or computer / Raspberry Pi at home / Internet Cube with VPN / Other ARM board / ..._
- YunoHost version: x.x.x
- I have access to my server: _Through SSH | through the webadmin | direct access via keyboard / screen | ..._
- Are you in a special context or did you perform some particular tweaking on your YunoHost instance?: _no / yes_
  - If yes, please explain:
- Using, or trying to install package version/branch:
- If upgrading, current package version: _can be found in the admin, or with `yunohost app info $app_id`_

### Steps to reproduce

- _If you performed a command from the CLI, the command itself is enough. For example:_
  ```sh
  sudo yunohost app install the_app
  ```
- _If you used the webadmin, please perform the equivalent command from the CLI first._
- _If the error occurs in your browser, explain what you did:_
  1.  _Go to '...'_
  2.  _Click on '...'_
  3.  _Scroll down to '...'_
  4.  _See error_

### Expected behavior

_A clear and concise description of what you expected to happen. You can remove this section if the command above is enough to understand your intent._

### Logs

_When an operation fails, YunoHost provides a simple way to share the logs._

- _In the webadmin, the error message contains a link to the relevant log page. On that page, you will be able to 'Share with Yunopaste'. If you missed it, the logs of previous operations are also available under Tools > Logs._
- _In command line, the command to share the logs is displayed at the end of the operation and looks like `yunohost log display [log name] --share`. If you missed it, you can find the log ID of a previous operation using `yunohost log list`._

_After sharing the log, please copypaste directly the link provided by YunoHost (to help readability, no need to copypaste the entire content of the log here, just the link is enough...)_

_If applicable and useful, add screenshots to help explain your problem._
