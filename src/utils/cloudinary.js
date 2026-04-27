import { v2 as cloudinary } from "cloudinary";
import { log } from "node:console";
import fs from "node:fs"

 cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_CLOUD_KEY, 
        api_secret: process.env.CLOUDINARY_CLOUD_SECRET // Click 'View API Keys' above to copy your API secret
    });

const uploadOnCloudinary = async (localpath)=>{
    try {
        if(!localpath) return null
        //Upload Starts here
        const response = await cloudinary.uploader.upload(localpath, {
            resource_type: "auto"
        })
        //File has been uploaded 
        // console.log("File has been uploaded on Cloudinary", response);
        fs.unlinkSync(localpath)
        return response        
    } catch (error) {
        fs.unlinkSync(localpath) // It'll remove the locally saved file
        return null
    }
}

export {uploadOnCloudinary}