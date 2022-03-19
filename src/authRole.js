// Authenticate Role Middleware
// Will query the cookie and or server for current user role to allow them to access certain elements

const authRole = (permissions) => {
    return (req, res, next) => {
        const userRole = req.body.access
        if(pemissions.includes(userRole)){
            next()
    } else {
        return  res.status(401).json("Insufficent Permissions")
    }

    }
};