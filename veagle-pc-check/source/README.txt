VEAGLE PC CHECK  v0.2.0
=======================
VEAGLE - ferelis.gr

A free, read-only health check for your Windows 10/11 PC.
It looks at your hardware, drives, security settings, installed programs, startup items and
the Windows Event Viewer, then builds a report you open in your browser.

HOW TO USE
----------
1. Right-click the ZIP file, choose Properties, tick "Unblock" if you see it, click OK.
2. Extract the WHOLE ZIP to a normal folder (for example your Desktop).
3. Double-click  VEAGLE-PC-Check.bat   (full scan, 3 to 5 minutes)
   or  VEAGLE-PC-Check-Quick.bat   (quick scan, about 30 seconds: skips msinfo32, app updates
   via winget, the Windows image check and a few slow checks).
4. Click "Yes" when Windows asks for administrator rights (needed to read drive health,
   BitLocker status and the Windows image check).
5. Wait 3 to 5 minutes. A black window shows the progress. When it finishes, the report
   opens in your browser.

Want to see what the report looks like first?  Open SAMPLE-REPORT.html (demo data).

IN THE REPORT
-------------
Dashboard   health score, areas, the three things to do first, hardware overview.
Findings    every problem with the reason, evidence and copy-paste fixes.
Hardware / Software / Events   the full details.
Compare     drop an older scan (data.json or report.html) to see what got better or worse.
AI help     get a second opinion from an AI (see below).
Share-safe copy (top right)   downloads the report with your name, PC name, IP/MAC addresses
            and e-mail addresses removed, so you can send it to someone.
Also: Windows 11 readiness (for Windows 10 PCs) and battery health (for laptops).

WHAT IT DOES NOT DO
-------------------
- It does not change any setting, install anything or delete anything.
- It does not upload anything. The report is a single file on your PC and works offline.
- It does not collect passwords, product keys or serial numbers.
- The only network use is "winget", the Windows package tool, which is asked which of
  your programs have updates.

WHERE ARE MY RESULTS?
---------------------
Reports\<date-time>\report.html   the report
Reports\<date-time>\data.json     the same data, in machine-readable form
Reports\<date-time>\raw\          exported files (msinfo32, systeminfo, event logs, app list, battery report)
These stay on your PC. Delete the folder whenever you like.

GETTING HELP FROM AN AI
-----------------------
In the report, open the "AI help" tab. It builds a text package from the scan with your user
name, PC name, IP/MAC addresses and e-mail addresses removed, and shows you exactly what will
be copied. "Copy and open Claude" copies it and opens Claude, where you paste it with Ctrl+V.
ChatGPT, Gemini and Copilot buttons are there for a second opinion.
Please read the preview before you paste: program names and file paths can still say
something about you.

IF SOMETHING GOES WRONG
-----------------------
- Windows SmartScreen or your antivirus complains about the .bat file: it is a plain text
  file you can open in Notepad. It only starts app\collector.ps1 (also plain text).
  Click "More info" then "Run anyway", or ask your antivirus to allow it.
- The window closes at once: right-click the .bat, "Run as administrator".
- The report is empty or part of it is missing: the report has a "Scan notes" section at the
  bottom of the Events tab that says which check did not work.

Brand, idea and design: VEAGLE - https://ferelis.gr
Built with the help of Claude (Anthropic).
When you share the scan with an AI, the package says that the data comes from the VEAGLE PC Check app (ferelis.gr), built with the help of Claude.
