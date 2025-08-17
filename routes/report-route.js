import express from "express";
const router = express.Router();
import { authenticate, authorize } from "../middleware/middleware.js";
import {
  getOutstandingBillsReport,
  getInvoicesReceivedAtSite,
  getInvoicesCourierToPIMOMumbai,
  getInvoicesReceivedAtPIMOMumbai,
  getInvoicesGivenToAcctsDept,
  getInvoicesGivenToQsSite,
  getInvoicesPaid,
  getPendingBillsReport,
  getBillJourney,
  getInvoicesAtQSforProvCOP,
  getInvoicesAtQSMumbai,
  getInvoicesReturnedByQsSite,
  getInvoicesReturnedByQsCOP,
  getInvoicesReturnedByQSMumbai,
} from "../controllers/report-controller.js";

// Authentication middleware for all routes
router.use(authenticate);

//gets all outstanding bills
router.get(
  "/outstanding-bills",
  authorize(["accounts", "director", "admin"]),
  getOutstandingBillsReport
);

//gets all invoices at site
router.get(
  "/invoices-received-at-site",
  authorize(["site_officer", "site_pimo", "admin", "director", "pimo_mumbai"]),
  getInvoicesReceivedAtSite
);
//gets all invoices at PIMO MUMBAI
router.get(
  "/invoices-received-at-pimo-mumbai",
  authorize(["pimo_mumbai", "director", "admin"]),
  getInvoicesReceivedAtPIMOMumbai
);
//gets all invoices at QS for measurement
router.get(
  "/invoices-received-at-qsmeasurement",
  authorize([
    "site_pimo",
    "site_officer",
    "qs_site",
    "qs_mumbai",
    "pimo_mumbai",
    "admin",
  ]),
  getInvoicesGivenToQsSite
);
//gets all invoices at QS for Prov COP
router.get(
  "/invoices-received-at-qscop",
  authorize([
    "site_pimo",
    "site_officer",
    "qs_site",
    "qs_mumbai",
    "pimo_mumbai",
    "admin",
  ]),
  getInvoicesAtQSforProvCOP
);
//gets all invoices at QS Mumbai for COP
router.get(
  "/invoices-received-at-qsmumbai",
  authorize(["qs_site", "qs_mumbai", "pimo_mumbai", "admin"]),
  getInvoicesAtQSMumbai
);

//gets all invoices sent to PIMO Mumbai
router.get(
  "/invoices-courier-to-pimo-mumbai",
  authorize(["site_officer", "site_pimo", "pimo_mumbai", "admin"]),
  getInvoicesCourierToPIMOMumbai
);
//get all invoices returned by QS measurement
router.get(
  "/invoices-returned-by-qsmeasurement",
  authorize(["qs_site", "qs_mumbai", "admin"]),
  getInvoicesReturnedByQsSite
);
//get all invoices returned by QS COP
router.get(
  "/invoices-returned-by-qscop",
  authorize(["qs_site", "qs_mumbai", "admin"]),
  getInvoicesReturnedByQsCOP
);
//get all invoices returned by QS Mumbai
router.get(
  "/invoices-returned-by-qsmumbai",
  authorize(["qs_site", "qs_mumbai", "admin"]),
  getInvoicesReturnedByQSMumbai
);
//get all invoices given too accounts
router.get(
  "/invoices-given-to-accounts",
  authorize(["pimo_mumbai", "admin"]),
  getInvoicesGivenToAcctsDept
);
//gget all invoices paid
router.get(
  "/invoices-Paid",
  authorize(["accounts", "director", "admin"]),
  getInvoicesPaid
);
router.get(
  "/pending-bills",
  authorize(["admin", "site_officer", "site_pimo", "qs_site", "pimo_mumbai"]),
  getPendingBillsReport
);

/**
 * @route GET /api/reports/bill-journey
 * @desc Get report of bills journey through the processing workflow
 * @access Private (All authorized users)
 */
router.get(
  "/bill-journey",
  authorize([
    "admin",
    "site_officer",
    "site_pimo",
    "qs_site",
    "pimo_mumbai",
    "director",
    "accounts",
  ]),
  getBillJourney
);

export default router;
