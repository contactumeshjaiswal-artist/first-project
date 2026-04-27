import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema(
    {
        subscriber:{
            type: Schema.Types.ObjectId, // User the Subscriber
            ref: "User"
        },
        channel:{
            type: Schema.Types.ObjectId, // User the Channel Owner
            ref: "User"
        },

    },
    {timestamps:true}
)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)