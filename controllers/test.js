import Bill from "../models/bill-model.js";
import WorkFlowFinal from "../models/workflow-final-model";

export const changeBatchWorkflowState = async (req, res) => {
  try {
    const { fromUser, toUser, billIds, action, remarks } = req.body;

    const { id: fromId, name: fromName, role: fromRoles } = fromUser;
    const { id: toId, name: toName, role: toRoles } = toUser;

    const fromRoleArray = Array.isArray(fromRoles) ? fromRoles : [fromRoles];
    const toRoleArray = Array.isArray(toRoles) ? toRoles : [toRoles];

    if (
      !fromUser ||
      !toUser ||
      !billIds ||
      !Array.isArray(billIds) ||
      billIds.length === 0 ||
      !action
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields or billIds must be a non-empty array",
      });
    }

    // Results tracking
    const results = {
      success: [],
      failed: [],
    };

    for (const billId of billIds) {
      try {
        const billFound = await Bill.findById(billId)
          .populate("natureOfWork")
          .populate("region")
          .populate("currency")
          .populate("panStatus")
          .populate("compliance206AB");

        if (!billFound) {
          results.failed.push({
            billId,
            message: "Bill not found",
          });
          continue;
        }

        if (billFound.siteStatus === "rejected") {
          results.failed.push({
            billId,
            message: "Bill is already rejected",
          });
          continue;
        }

        const lastWorkflow = await WorkFlowFinal.findOne({ billId }).sort({
          createdAt: -1,
        });

        // Create new workflow record
        let newWorkflow = await WorkFlowFinal.create({
          fromUser: {
            id: fromId,
            name: fromName,
            role: fromRoleArray[0],
          },
          toUser: {
            id: toId ? toId : null,
            name: toName,
            role: toRoleArray[0],
          },
          billId,
          action,
          remarks,
          duration: lastWorkflow ? new Date() - lastWorkflow.createdAt : 0,
        });

        newWorkflow = await newWorkflow.populate([
          { path: "fromUser.id", select: "name role department" },
          { path: "toUser.id", select: "name role department" },
        ]);

        const now = new Date();
        let billWorkflow = null;

        // Site team transitions
        if (
          (fromRoleArray.includes("site_officer") ||
            fromRoleArray.includes("site_team")) &&
          (toRoleArray.includes("quality_engineer") ||
            toRoleArray.includes("qs_measurement") ||
            toRoleArray.includes("qs_cop") ||
            toRoleArray.includes("site_dispatch_team") ||
            toRoleArray.includes("site_architect") ||
            toRoleArray.includes("site_incharge") ||
            toRoleArray.includes("site_engineer") ||
            toRoleArray.includes("migo_entry"))
        ) {
          let setObj = {
            maxCount: 1,
            currentCount: 1,
          };

          if (toRoleArray.includes("quality_engineer")) {
            if (billFound.natureOfWork?.natureOfWork == "Service") {
              results.failed.push({
                billId,
                message:
                  "Service bill cannot be forwarded to Quality Inspector",
              });
              continue;
            } else {
              console.log(
                `Forwarding bill ${billId} to Quality Inspector from Site Officer`
              );
              setObj["qualityEngineer.dateGiven"] = now;
              setObj["qualityEngineer.name"] = toName;
            }
          } else if (toRoleArray.includes("qs_measurement")) {
            console.log(
              `Forwarding bill ${billId} to Quantity Surveyor for Measurement from Site Officer`
            );
            setObj["qsInspection.dateGiven"] = now;
            setObj["qsInspection.name"] = toName;
          } else if (toRoleArray.includes("qs_cop")) {
            console.log(
              `Forwarding bill ${billId} to Quantity Surveyor for COP from Site Officer`
            );
            setObj["qsCOP.dateGiven"] = now;
            setObj["qsCOP.name"] = toName;
          } else if (toRoleArray.includes("migo_entry")) {
            console.log(
              `Forwarding bill ${billId} to MIGO ENtry from Site Officer`
            );
            setObj["migoDetails.dateGiven"] = now;
            setObj["migoDetails.doneBy"] = toName;
          } else if (toRoleArray.includes("site_engineer")) {
            console.log(
              `Forwarding bill ${billId} to Site Engineer from Site Officer`
            );
            setObj["siteEngineer.dateGiven"] = now;
            setObj["siteEngineer.name"] = toName;
          } else if (toRoleArray.includes("site_architect")) {
            if (billFound.natureOfWork?.natureOfWork == "Material") {
              results.failed.push({
                billId,
                message: "Material bills cannot be forwarded to Site Architect",
              });
              continue;
            } else {
              console.log(
                `Forwarding bill ${billId} to Site Architect from Site Officer`
              );
              setObj["architect.dateGiven"] = now;
              setObj["architect.name"] = toName;
            }
          } else if (toRoleArray.includes("site_incharge")) {
            console.log(
              `Forwarding bill ${billId} to Site Incharge from Site Officer`
            );
            setObj["siteIncharge.dateGiven"] = now;
            setObj["siteIncharge.name"] = toName;
          } else if (toRoleArray.includes("site_dispatch_team")) {
            console.log(
              `Forwarding bill ${billId} to Site Dispatch Team from Site Officer`
            );
            setObj["siteOfficeDispatch.name"] = toName;
            setObj["siteOfficeDispatch.dateGiven"] = now;
          }

          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            { $set: setObj },
            { new: true }
          );
        }

        //site officer to pimo mumbai
        else if (
          fromRoleArray.includes("site_team") &&
          toRoleArray.includes("pimo_mumbai") &&
          action == "forward"
        ) {
          console.log(
            `Forwarding bill ${billId} to PIMO Mumbai from Site Officer`
          );
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                currentCount: 2,
                maxCount: Math.max(billFound.maxCount, 2),
                "pimoMumbai.dateGiven": now,
                "pimoMumbai.namePIMO": toName,
              },
            },
            { new: true }
          );
        }

        // PIMO Mumbai to QS Mumbai
        else if (
          fromRoleArray.includes("pimo_mumbai") &&
          toRoleArray.includes("qs_mumbai") &&
          action == "forward"
        ) {
          console.log(
            `Forwarding bill ${billId} to QS Mumbai from PIMO Mumbai`
          );
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                currentCount: 3,
                maxCount: Math.max(billFound.maxCount, 3),
                "qsMumbai.dateGiven": now,
                "qsMumbai.name": toName,
              },
              //   remove $ push
              $push: {
                "workflowState.history": {
                  state: "QS_Mumbai",
                  timestamp: now,
                  actor: toName,
                  comments: remarks,
                  action: "forward",
                },
              },
            },
            {
              new: true,
            }
          );
        }

        // QS Mumbai to PIMO Mumbai
        else if (
          fromRoleArray.includes("qs_mumbai") &&
          toRoleArray.includes("pimo_mumbai") &&
          action == "forward"
        ) {
          console.log(
            `Forwarding bill ${billId} to PIMO Mumbai from QS Mumbai`
          );
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                currentCount: 4,
                maxCount: Math.max(billFound.maxCount, 4),
                "pimoMumbai.dateReturnedFromQs": now,
                "pimoMumbai.receivedBy": toName,
              },
            },
            {
              new: true,
            }
          );
        }

        // PIMO Mumbai to Trustees
        else if (
          fromRoleArray.includes("pimo_mumbai") &&
          (toRoleArray.includes("it_department") ||
            toRoleArray.includes("ses_team") ||
            toRoleArray.includes("pimo_dispatch_team") ||
            toRoleArray.includes("trustees")) &&
          action == "forward"
        ) {
          let setObj = {
            currentCount: 5,
            maxCount: Math.max(billFound.maxCount, 5),
          };
          if (toRoleArray.includes("it_department")) {
            console.log(
              `Forwarding bill ${billId} to IT Department from PIMO Mumbai`
            );
            setObj["itDept.dateGiven"] = now;
            setObj["itDept.name"] = toName;
          } else if (toRoleArray.includes("ses_team")) {
            console.log(
              `Forwarding bill ${billId} to SES Team from PIMO Mumbai`
            );
            setObj["sesDetails.dateGiven"] = now;
            setObj["sesDetails.name"] = toName;
          } else if (toRoleArray.includes("pimo_dispatch_team")) {
            console.log(
              `Forwarding bill ${billId} to PIMO Dispatch Team from PIMO Mumbai`
            );
            setObj["pimo.dateReceivedFromIT"] = now;
            setObj["pimo.dateReceivedFromPIMO"] = now;
          } else if (toRoleArray.includes("trustees")) {
            console.log(
              `Forwarding bill ${billId} to Trustees from PIMO Mumbai`
            );
            setObj["approvalDetails.directorApproval.dateGiven"] = now;
            console.log(setObj);
          }
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                ...setObj,
              },
              $push: {
                "workflowState.history": {
                  state: "Trustees",
                  timestamp: now,
                  actor: toName,
                  comments: remarks,
                  action: "forward",
                },
              },
            },
            {
              new: true,
            }
          );
        }

        // Trustees to PIMO Mumbai
        else if (
          fromRoleArray.includes("trustees") &&
          toRoleArray.includes("pimo_mumbai") &&
          action == "forward"
        ) {
          console.log(`Forwarding bill ${billId} to PIMO Mumbai from Trustees`);
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                currentCount: 6,
                maxCount: Math.max(billFound.maxCount, 6),
                "pimoMumbai.dateReceivedFromIT": now,
                "pimoMumbai.receivedBy": toName,
                "workflowState.currentState": "PIMO_Mumbai",
                "workflowState.lastUpdated": now,
              },
              $push: {
                "workflowState.history": {
                  state: "PIMO_Mumbai",
                  timestamp: now,
                  actor: toName,
                  comments: remarks,
                  action: "forward",
                },
              },
            },
            { new: true }
          );
        }

        // PIMO Mumbai to Accounts Department
        else if (
          fromRoleArray.includes("pimo_mumbai") &&
          toRoleArray.includes("accounts_department") &&
          action == "forward"
        ) {
          console.log(
            `Forwarding bill ${billId} to Accounts Department from PIMO Mumbai`
          );
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                currentCount: 7,
                maxCount: Math.max(billFound.maxCount, 7),
                "accountsDept.dateGiven": now,
                "accountsDept.givenBy": toName,
                "accountsDept.remarksAcctsDept": remarks,
                "workflowState.currentState": "Accounts_Department",
                "workflowState.lastUpdated": now,
              },
              $push: {
                "workflowState.history": {
                  state: "Accounts_Department",
                  timestamp: now,
                  actor: toName,
                  comments: remarks,
                  action: "forward",
                },
              },
            },
            { new: true }
          );
        } else if (
          fromRoleArray.includes("accounts_department") &&
          (toRoleArray.includes("booking_team") ||
            toRoleArray.includes("payment_team")) &&
          action == "forward"
        ) {
          let setObj = {
            currentCount: 8,
            maxCount: Math.max(billFound.maxCount, 8),
          };
          if (toRoleArray.includes("booking_team")) {
            console.log(
              `Forwarding bill ${billId} to Booking Team from Accounts Department`
            );
            setObj["accountsDept.invBookingChecking"] = now;
          } else if (toRoleArray.includes("payment_team")) {
            console.log(
              `Forwarding bill ${billId} to Payment Team from Accounts Department`
            );
            setObj["accountsDept.paymentInstructions"] = now;
          }
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                setObj,
                "workflowState.currentState": "Accounts_Department",
                "workflowState.lastUpdated": now,
              },
              $push: {
                "workflowState.history": {
                  state: "Accounts_Department",
                  timestamp: now,
                  actor: toName,
                  comments: remarks,
                  action: "forward",
                },
              },
            },
            { new: true }
          );
        }

        //backward flow - pimo to site incharge
        else if (
          fromRoleArray.includes("pimo_mumbai") &&
          toRoleArray.includes("site_incharge") &&
          action === "backward"
        ) {
          console.log(
            `Reverting bill ${billId} to Site Incharge from PIMO Mumbai`
          );
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                currentCount: 1,
              },
              $push: {
                "workflowState.history": {
                  state: "Site_Incharge",
                  timestamp: now,
                  actor: toName,
                  comments: remarks,
                  action: "backward",
                },
              },
            },
            { new: true }
          );
        }

        // Backward flow - QS Mumbai to PIMO Mumbai
        else if (
          fromRoleArray.includes("qs_mumbai") &&
          toRoleArray.includes("pimo_mumbai") &&
          action === "backward"
        ) {
          console.log(`Reverting bill ${billId} to PIMO Mumbai from QS Mumbai`);
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                currentCount: 2,
              },
              $push: {
                "workflowState.history": {
                  state: "PIMO_Mumbai",
                  timestamp: now,
                  actor: toName,
                  comments: remarks,
                  action: "backward",
                },
              },
            },
            { new: true }
          );
        }

        // Backward flow - PIMO Mumbai to QS Mumbai
        else if (
          fromRoleArray.includes("pimo_mumbai") &&
          toRoleArray.includes("qs_mumbai") &&
          action === "backward"
        ) {
          console.log(`Reverting bill ${billId} to QS Mumbai from PIMO Mumbai`);
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                currentCount: 3,
              },
              $push: {
                "workflowState.history": {
                  state: "QS_Mumbai",
                  timestamp: now,
                  actor: toName,
                  comments: remarks,
                  action: "backward",
                },
              },
            },
            { new: true }
          );
        }

        // Backward flow - Trustees to PIMO Mumbai
        else if (
          fromRoleArray.includes("trustees") &&
          toRoleArray.includes("pimo_mumbai") &&
          action === "backward"
        ) {
          console.log(`Reverting bill ${billId} to PIMO Mumbai from Trustees`);
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                currentCount: 4,
              },
              $push: {
                "workflowState.history": {
                  state: "PIMO_Mumbai",
                  timestamp: now,
                  actor: toName,
                  comments: remarks,
                  action: "backward",
                },
              },
            },
            { new: true }
          );
        }

        // Backward flow - PIMO Mumbai to Trustees (fixed typo in original code)
        else if (
          fromRoleArray.includes("pimo_mumbai") &&
          toRoleArray.includes("trustees") &&
          action === "backward"
        ) {
          console.log(`Reverting bill ${billId} to Trustees from PIMO Mumbai`);
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                currentCount: 5,
              },
              $push: {
                "workflowState.history": {
                  state: "Trustees",
                  timestamp: now,
                  actor: toName,
                  comments: remarks,
                  action: "backward",
                },
              },
            },
            { new: true }
          );
        }

        // Backward flow - Accounts Department to PIMO Mumbai
        else if (
          fromRoleArray.includes("accounts_department") &&
          toRoleArray.includes("pimo_mumbai") &&
          action === "backward"
        ) {
          console.log(
            `Reverting bill ${billId} to PIMO Mumbai from Accounts Department`
          );
          billWorkflow = await Bill.findByIdAndUpdate(
            billId,
            {
              $set: {
                currentCount: 6,
              },
              $push: {
                "workflowState.history": {
                  state: "PIMO_Mumbai",
                  timestamp: now,
                  actor: toName,
                  comments: remarks,
                  action: "backward",
                },
              },
            },
            { new: true }
          );
        } else {
          // If no matching workflow condition was found
          results.failed.push({
            billId,
            message: "No matching workflow transition rule found",
          });
          continue;
        }

        if (billWorkflow) {
          results.success.push({
            billId,
            workflow: newWorkflow,
          });
        } else {
          results.failed.push({
            billId,
            message: "Failed to update bill workflow",
          });
        }
      } catch (error) {
        console.error(`Error processing bill ${billId}:`, error);
        results.failed.push({
          billId,
          message: error.message,
        });
      }
    }

    // Return final result
    return res.status(200).json({
      success: true,
      message: `Processed ${billIds.length} bills: ${results.success.length} successful, ${results.failed.length} failed`,
      data: {
        successful: results.success,
        failed: results.failed,
      },
    });
  } catch (error) {
    console.error("Batch workflow state change error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process batch workflow state change",
      error: error.message,
    });
  }
};
