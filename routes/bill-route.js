import express from 'express';
import billController from '../controllers/bill-controller.js';
import { authenticate, authorize, validateWorkflowTransition, validateStateAccess, authMiddleware } from '../middleware/middleware.js';
import { multerUpload } from '../utils/multer.js';

const router = express.Router();
router.use(authenticate);


router.post(
    '/', 
    multerUpload.array("files", 15), 
    // authorize('admin', 'site_officer'), 
    billController.createBill
);
router.get('/', authMiddleware, billController.getBills);
router.get('/:id', billController.getBill);
router.get('/srno/:srNo', billController.getBillBySrNo); // Get bill by srNo (7 digits)
router.put('/:id', authorize('admin', 'site_officer'), billController.updateBill);
router.delete('/:id', authorize('admin'), billController.deleteBill);


// Bill filtering routes
router.post('/filter', billController.filterBills);
router.get('/stats/overview', billController.getBillsStats);

// Serial number regeneration route - admin only
// router.post('/regenerate-serial-numbers', authorize('admin'), billController.regenerateAllSerialNumbers);

// // Workflow routes with appropriate middleware
// router.post('/workflow/:id/advance', validateWorkflowTransition, billController.advanceWorkflow);
// router.post('/workflow/:id/revert', validateWorkflowTransition, billController.revertWorkflow);
// router.post('/workflow/:id/reject', validateWorkflowTransition, billController.rejectBill);
// router.post('/workflow/:id/recover', validateWorkflowTransition, billController.recoverRejectedBill);
// router.get('/workflow/:id/history', billController.getWorkflowHistory);
// router.get('/workflow/state/:state', validateStateAccess, billController.getBillsByWorkflowState);

// // Workflow state update 2
// router.patch('/:id/workflow2', authenticate, billController.changeWorkflowState);

// PATCH route for editing bill by id or srNo (id is optional)
router.patch('/:id?', billController.patchBill);
//receiveBillByPimoAccounts
router.post('/receiveBill', billController.receiveBillByPimoAccounts);

export default router;