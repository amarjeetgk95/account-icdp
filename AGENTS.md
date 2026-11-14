# Gujarat Government Payroll & Financial Accounting Rules

## Mandatory Accounting Context for AI Agents

When modifying or analyzing any code related to Payroll, Paybill, Tax Reconciliation, 24Q, Form 16, or Salary Reports in this codebase:

### 1. Gujarat Government 12-Month Treasury Cycle
In Gujarat State Government accounting:
* **Paybill is made in the working month** (e.g. May).
* **Payment & treasury voucher generation happen on the 2nd of the next month** (e.g. June 2nd) $\rightarrow$ **"May paid in June"**.
* **Financial Year is April 1 to March 31**, but salaries are accounted by **voucher generation month**:
  * **March salary** is prepared in March, but treasury settlement and voucher generation occur in **early April**.
  * Therefore, **March salary is booked in April**, making it **Month 1 of the April–March Financial Year cycle** (*March paid in April*).
  * **February salary** is prepared in February and paid in **March**, making it **Month 12 (the final month) of the Financial Year cycle** (*February paid in March*).
  * The subsequent March salary will have its voucher generated in next April, belonging to the next Financial Year.

### 2. 12-Month Mapping Table for FY (e.g. FY 2026–27)

| Slot | Work Month | Voucher / Payment Month | UI Dropdown Label | Quarter |
| :--- | :--- | :--- | :--- | :--- |
| **1** | March 2026 | **April 2026** | March-26 paid in April-26 | Q1 |
| **2** | April 2026 | **May 2026** | April-26 paid in May-26 | Q1 |
| **3** | May 2026 | **June 2026** | May-26 paid in June-26 | Q1 |
| **4** | June 2026 | **July 2026** | June-26 paid in July-26 | Q2 |
| **5** | July 2026 | **August 2026** | July-26 paid in August-26 | Q2 |
| **6** | August 2026 | **September 2026** | August-26 paid in September-26 | Q2 |
| **7** | September 2026 | **October 2026** | September-26 paid in October-26 | Q3 |
| **8** | October 2026 | **November 2026** | October-26 paid in November-26 | Q3 |
| **9** | November 2026 | **December 2026** | November-26 paid in December-26 | Q3 |
| **10** | December 2026 | **January 2027** | December-26 paid in January-27 | Q4 |
| **11** | January 2027 | **February 2027** | January-27 paid in February-27 | Q4 |
| **12** | February 2027 | **March 2027** | February-27 paid in March-27 | Q4 |

Detailed documentation: [docs/domain-rules-gujarat-gov-payroll.md](file:///docs/domain-rules-gujarat-gov-payroll.md)
