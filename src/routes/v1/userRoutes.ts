import { Router } from "express";
import { authenticate } from "../../middlewares/authMiddleware";
import { getProfile, updateProfile } from "../../controllers/userController";

const userRouter = Router()

userRouter.use(authenticate)

userRouter.get("/me", getProfile)
userRouter.patch("/me", updateProfile)

export default userRouter