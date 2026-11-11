# Gujarat Government Payroll & Financial Year Accounting Rules

## Core Rule: 12-Month Treasury Cycle (March-Paid-in-April to Feb-Paid-in-March)

In the Gujarat State Government accounting system, the payroll and treasury voucher settlement cycle operates as follows:

### 1. Paybill Preparation vs. Payment Month ("Work Month" vs. "Paid Month")
* An employee's paybill is prepared in the **current working month** (e.g., during May).
* Settlement, treasury voucher generation, and actual salary disbursement happen on the **2nd of the next month** (e.g., June 2nd).
* This is why it is termed: **`[Work Month] paid in [Payment Month]`** (e.g., *"May paid in June"*).

### 2. Financial Year Cycle (April 1 to March 31)
Although the financial year spans from April 1 to March 31, government accounts book salaries based on the **treasury voucher generation / settlement date in April through March**:

* **March Salary:**
  * Prepared in March.
  * Settlement, treasury token, voucher generation, and disbursement happen in **early April**.
  * **Result:** The March salary is booked in **April** $\rightarrow$ It is officially included as the **first month** of the April–March Financial Year cycle.

* **February Salary:**
  * Prepared in February.
  * Voucher generation and disbursement happen in **March**.
  * **Result:** It is booked in **March** $\rightarrow$ It is the **12th (last) month** of the Financial Year cycle.

* **Next March Salary:**
  * Prepared in the following March.
  * Voucher generation happens in **April of the next financial year**.
  * **Result:** Belongs to the **subsequent Financial Year**.

---

### 3. Financial Year Month Mapping Reference Table (e.g., FY 2026–27)

| Cycle Slot | Work Month | Payment / Voucher Month | FY Label in System | Quarter (24Q) |
| :---: | :---: | :---: | :---: | :---: |
| **Month 1** | March 2026 | **April 2026** | March-26 paid in April-26 | Q1 |
| **Month 2** | April 2026 | **May 2026** | April-26 paid in May-26 | Q1 |
| **Month 3** | May 2026 | **June 2026** | May-26 paid in June-26 | Q1 |
| **Month 4** | June 2026 | **July 2026** | June-26 paid in July-26 | Q2 |
| **Month 5** | July 2026 | **August 2026** | July-26 paid in August-26 | Q2 |
| **Month 6** | August 2026 | **September 2026** | August-26 paid in September-26 | Q2 |
| **Month 7** | September 2026 | **October 2026** | September-26 paid in October-26 | Q3 |
| **Month 8** | October 2026 | **November 2026** | October-26 paid in November-26 | Q3 |
| **Month 9** | November 2026 | **December 2026** | November-26 paid in December-26 | Q3 |
| **Month 10** | December 2026 | **January 2027** | December-26 paid in January-27 | Q4 |
| **Month 11** | January 2027 | **February 2027** | January-27 paid in February-27 | Q4 |
| **Month 12** | February 2027 | **March 2027** | February-27 paid in March-27 | Q4 |

---

### 4. Critical Software Design Guidelines

1. **UI Clarity:**
   When presenting monthly tables (like in `SalaryLookup` or `QuarterReport`), clearly distinguish between:
   * **Work Month** (the month the employee worked, e.g. *March 2026*)
   * **Payment / Voucher Month** (the month when funds are disbursed, e.g. *April 2026*)
   Avoid displaying bare month names without clarifying whether it refers to the Work Month or the Payment Month.

2. **March Placement:**
   * In a Treasury FY cycle, the first voucher is for **March work paid in April**.
   * If a record is keyed as `month: 'March'`, the software must recognize whether it is referring to:
     * *March work month (paid in April)*, which belongs at the **start** of the FY cycle (Slot 1), OR
     * *February work month paid in March*, which is Slot 12.
   * Treating March as a generic end-of-year month causes older March data to wrongly display at the bottom (as March FY 27).

3. **Status Badges:**
   * Differentiate between manually entered rows (`employee_salaries`) $\rightarrow$ **"Entered"**
   * Imported rows (`employee_salary` / Karmayogi Excel) $\rightarrow$ **"Imported"**
   * Do not display `'matched'` imported rows as **"Entered"**.
