# -*- coding: utf-8 -*-
"""تولید گزارش PDF تغییرات ماه — اوت ۲۰۲۶ / مرداد–شهریور ۱۴۰۵"""
import os
from weasyprint import HTML

BASE = os.path.dirname(os.path.abspath(__file__))
FONT_REG = os.path.join(BASE, "..", "hermes", "fonts", "Vazirmatn-Regular.ttf")
FONT_BOLD = os.path.join(BASE, "..", "hermes", "fonts", "Vazirmatn-Bold.ttf")

FA = str.maketrans("0123456789,", "۰۱۲۳۴۵۶۷۸۹٬")

def fa(n):
    """تبدیل عدد به رشته فارسی با جداکننده هزارگان"""
    return f"{n:,}".translate(FA)

def money(n):
    return fa(n) + " ریال"

# ---------------- داده‌ها ----------------
commits = [
    ("8c12e6a", "۱۴۰۵/۰۵/۱۰", "رفع مشکل — حذف ۲ فایل خروجی قدیمی (CSV/XLSX)", "۲ فایل، −۱۱۴ خط"),
    ("91699fc", "۱۴۰۵/۰۵/۱۴", "به‌روزرسانی ابزار دیتابیس دستیار (database.ts)", "۱ فایل، ۱+/۱−"),
    ("4ac63dd", "۱۴۰۵/۰۵/۱۴", "به‌روزرسانی سرور (server/index.js)", "۱ فایل، ۱+ خط"),
    ("2bea5d0", "۱۴۰۵/۰۶/۰۲", "به‌روزرسانی بزرگ رابط کاربری: ورک‌اسپیس هوشمند، چت، تنظیمات", "۶۷ فایل، ‎+۵٬۹۹۰ / −۲٬۲۱۲"),
]

by_project = [
    ("PROJ000", 286), ("PROJ002", 48), ("PROJ001", 21),
    ("PROJ061", 12), ("PROJ021", 9), ("PROJ041", 6), ("PROJ022", 1),
]

by_type = [
    ("پرداخت", 173), ("شارژ تنخواه", 129), ("حقوق و دستمزد", 26),
    ("خرید", 26), ("مکاتبه وارده", 13), ("قرارداد", 6), ("مکاتبه صادره", 6),
    ("اسناد پرداختنی", 1), ("فروش", 1), ("قروش (غلط املایی «فروش»)", 1), ("هزینه تنخواه", 1),
]

top_parties = [
    ("شرکت ملی خطوط لوله و مخابرات نفت ایران", 4, 8623682548125),
    ("سازمان بهداشت و درمان صنعت نفت", 10, 335733801704),
    ("شرکت بهره‌برداری نفت و گاز کارون", 10, 210013235950),
    ("بدون طرف حساب (خالی)", 218, 117802217704),
    ("شرکت ملی مناطق نفت‌خیز جنوب", 49, 96755785333),
    ("متفرقه", 70, 67655203385),
    ("شرکت بهره‌برداری نفت و گاز آغاجاری", 2, 653180000),
]

recent_months = [
    ("فروردین ۱۴۰۵", 13, 5627299286),
    ("اردیبهشت ۱۴۰۵", 8, 15149775378),
    ("خرداد ۱۴۰۵", 18, 4162768013),
    ("تیر ۱۴۰۵", 4, 1166416615),
]

new_components = [
    "صفحه ورک‌اسپیس هوشمند (WorkspacePage) با بیش از ۵۰۰ خط کد",
    "استایل اختصاصی فضای کاری هوش مصنوعی (ai-workspace.css) — ۸۳۱ خط",
    "رابط چت هوش مصنوعی بهبودیافته (ChatPage) + استایل گفتگو (chat.css)",
    "کامپوننت نمودارها (charts.tsx)",
    "۱۳ کامپوننت UI جدید: انتخاب (Select)، تب‌ها، صفحه‌بندی، ورودی بانکی، ورودی قیمت، QR کد، نشان پیشرفت، اسپینر و…",
    "۵ هوک جدید React: وضعیت کنترل‌شده، کپی در کلیپ‌بورد، تشخیص اندازه صفحه، تم، زمان نسبی",
    "کتابخانه تاریخ شمسی + اعتبارسنجی Zod (persianDate.ts / persianDateZod.ts)",
    "بازنویسی کامل برگه تنظیمات (SettingsTab) و پروفایل (ProfileTab) با کاهش حجم کد",
]

def rows(data, cols=2):
    out = ""
    for r in data:
        out += "<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>"
    return out

html = f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head><meta charset="utf-8">
<style>
@font-face {{ font-family:'Vazirmatn'; src:url('file:///{FONT_REG.replace(chr(92), '/')}'); font-weight:normal; }}
@font-face {{ font-family:'Vazirmatn'; src:url('file:///{FONT_BOLD.replace(chr(92), '/')}'); font-weight:bold; }}
@page {{ size:A4; margin:18mm 15mm;
  @bottom-center {{ content:"صفحه " counter(page) " از " counter(pages); font-family:'Vazirmatn'; font-size:9px; color:#888; }} }}
body {{ font-family:'Vazirmatn', sans-serif; direction:rtl; font-size:11px; color:#222; line-height:1.9; }}
h1 {{ font-size:20px; color:#0d3b66; margin:0 0 2px; }}
h2 {{ font-size:14px; color:#0d3b66; border-bottom:2px solid #0d3b66; padding-bottom:4px; margin:22px 0 8px; }}
h3 {{ font-size:12px; color:#14537c; margin:14px 0 6px; }}
.sub {{ color:#666; font-size:10px; margin-bottom:14px; }}
.badge {{ display:inline-block; background:#eaf2fb; color:#0d3b66; border-radius:10px; padding:1px 10px; font-size:10px; margin-left:6px; }}
table {{ width:100%; border-collapse:collapse; margin:6px 0 12px; page-break-inside:auto; }}
th {{ background:#0d3b66; color:#fff; padding:5px 8px; font-size:10.5px; text-align:right; }}
td {{ border-bottom:1px solid #dde5ee; padding:4px 8px; font-size:10.5px; }}
tr:nth-child(even) td {{ background:#f6f9fc; }}
.kpi {{ display:flex; gap:8px; margin:10px 0; }}
.kpi div {{ flex:1; background:#eef4fa; border-radius:8px; padding:8px; text-align:center; }}
.kpi .num {{ font-size:17px; font-weight:bold; color:#0d3b66; display:block; }}
.kpi .lbl {{ font-size:9.5px; color:#555; }}
ul {{ margin:4px 0 10px; padding-right:18px; }}
li {{ margin-bottom:3px; }}
.note {{ background:#fff8e6; border-right:3px solid #e6a700; padding:7px 10px; border-radius:4px; font-size:10px; margin:8px 0; }}
.ok {{ background:#e9f7ee; border-right-color:#1d9e55; }}
code {{ background:#f0f0f0; padding:0 4px; border-radius:3px; font-size:9.5px; direction:ltr; unicode-bidi:embed; }}
</style></head>
<body>

<h1>گزارش تغییرات ماه</h1>
<div class="sub">بازه: اوت ۲۰۲۶ میلادی (مرداد – شهریور ۱۴۰۵) &nbsp;|&nbsp; تاریخ تهیه: ۱۴۰۵/۰۶/۰۳ &nbsp;|&nbsp; سامانه مدیریت برچسب‌ها و سوابق (Label Manager)</div>

<h2>۱) خلاصه مدیریتی</h2>
<ul>
<li>در این ماه <b>۴ کامیت</b> در مخزن گیت ثبت شد که مهم‌ترین آن‌ها به‌روزرسانی بزرگ <b>۲ شهریور</b> با تغییر در <b>۶۷ فایل</b> (‎+۵٬۹۹۰ / −۲٬۲۱۲ خط) بود.</li>
<li>تمرکز اصلی توسعه: <b>ورک‌اسپیس هوش مصنوعی</b>، بهبود <b>چت و دستیار</b>، بازنویسی <b>تنظیمات و پروفایل</b> و افزودن <b>تاریخ شمسی</b>.</li>
<li>در دیتابیس، <b>۳۸۳ رکورد</b> در ابتدای ماه (۱ اوت) به‌صورت یکجا وارد/مهاجرت شد؛ سند مالی این رکوردها از <b>مرداد ۱۴۰۱ تا تیر ۱۴۰۵</b> را پوشش می‌دهد.</li>
<li>مجموع مبالغ ثبت‌شده در رکوردها حدود <b>{money(8866325968796)}</b> است (بزرگ‌ترین سهم: قرارداد پروژه PROJ041).</li>
</ul>

<div class="kpi">
<div><span class="num">{fa(4)}</span><span class="lbl">کامیت گیت</span></div>
<div><span class="num">{fa(67)}</span><span class="lbl">فایل تغییریافته (بزرگ‌ترین کامیت)</span></div>
<div><span class="num">{fa(383)}</span><span class="lbl">رکورد واردشده به دیتابیس</span></div>
<div><span class="num">{fa(7)}</span><span class="lbl">پروژه فعال</span></div>
</div>

<h2>۲) فعالیت توسعه نرم‌افزار (گیت)</h2>
<table>
<tr><th>هش</th><th>تاریخ</th><th>شرح</th><th>حجم تغییر</th></tr>
{rows(commits)}
</table>

<h3>جزئیات کامیت اصلی (2bea5d0 — ۲ شهریور ۱۴۰۵)</h3>
<ul>
{''.join(f'<li>{x}</li>' for x in new_components)}
</ul>
<div class="note ok">نکته مثبت: افزودن کتابخانه تاریخ شمسی و اعتبارسنجی Zod، کیفیت فرم‌های ورود اطلاعات را برای کاربران فارسی‌زبان بهبود می‌دهد.</div>

<h2>۳) داده‌های سامانه (دیتابیس)</h2>
<p>تمام <b>۳۸۳ رکورد</b> موجود، در تاریخ ۱ اوت ۲۰۲۶ (۱۰ مرداد ۱۴۰۵) ایجاد شده‌اند که نشان‌دهنده <b>ورود اولیه/مهاجرت داده‌ها</b> در این ماه است. پس از آن هیچ رکورد جدیدی ثبت نشده است.</p>

<h3>۳-۱) توزیع رکوردها بر اساس پروژه</h3>
<table>
<tr><th>پروژه</th><th>تعداد رکورد</th><th>سهم</th></tr>
{rows([(p, fa(c), f"{fa(round(c*100/383))}٪") for p, c in by_project])}
</table>

<h3>۳-۲) توزیع رکوردها بر اساس نوع</h3>
<table>
<tr><th>نوع سند</th><th>تعداد</th></tr>
{rows([(t, fa(c)) for t, c in by_type])}
</table>

<h3>۳-۳) طرف‌های حساب با بیشترین مبلغ</h3>
<table>
<tr><th>طرف حساب</th><th>تعداد رکورد</th><th>مجموع مبلغ</th></tr>
{rows([(p, fa(c), money(a)) for p, c, a in top_parties])}
</table>

<h3>۳-۴) روند اسناد مالی چند ماه اخیر (بر اساس تاریخ سند)</h3>
<table>
<tr><th>ماه</th><th>تعداد سند</th><th>مجموع مبلغ</th></tr>
{rows([(m, fa(c), money(a)) for m, c, a in recent_months])}
</table>
<p class="sub">توجه: آخرین اسناد دارای تاریخ شمسی مربوط به تیر ۱۴۰۵ است؛ برای مرداد و شهریور هنوز سندی ثبت نشده است.</p>

<h2>۴) نکات و توصیه‌ها</h2>
<ul>
<li><b>۲۱۸ رکورد بدون طرف حساب:</b> پیشنهاد می‌شود تکمیل شوند تا گزارش‌های تحلیلی دقیق‌تر شود.</li>
<li><b>غلط املایی «قروش»:</b> یک رکورد با نوع اشتباه ثبت شده؛ اصلاح به «فروش» توصیه می‌شود.</li>
<li><b>عدم ثبت سند جدید پس از مهاجرت:</b> ورود اطلاعات ماه‌های اخیر (مرداد/شهریور) در حالت تعلیق است.</li>
<li><b>پیام‌های کامیت:</b> استفاده از پیام‌های توصیفی (مطابق الگوی commitهای میانه سال) به‌جای «update» توصیه می‌شود.</li>
</ul>

<div class="note">این گزارش به‌صورت خودکار توسط دستیار (Hermes) از روی مخزن گیت و دیتابیس SQLite پروژه تولید شده است.</div>

</body></html>"""

out = os.path.join(BASE, "monthly-changes-report-1405.pdf")
HTML(string=html).write_pdf(out)
print("PDF saved:", out)
