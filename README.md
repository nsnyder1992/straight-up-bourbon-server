# Straight Up Bourbon Server

This the backend for the website for the Straight Up Bourbon YouTube channel. This project was created using node.js.

Because some controllers use both admin and user privileges some endpoints are individually protected by middleware

API URL: https://straight-up-bourbon-server.herokuapp.com/

## Major Functionality

1. ### Users:

   `~/users`

   - **GET** `/byId/:id`
     - Get user by ID
   - **GET** `/:page/:limit`
     - Get All users (paginated)
   - **GET** `/self`
     - Get signed in user
   - **POST** `/signup`
     - Registers new user account
   - **POST** `/login`
     - Logs in a user
   - **POST** `/forgotPassword`
     - sets token and send email
   - **PUT** `/updatePasswordViaEmail`
     - Resets password if token matches
   - **PUT** `/addmin/:id`
     - Make user and admin

2. ### Products:

   `~/product`

   - **GET** `/:id`
     - Get Product by ID
   - **GET** `/:page/:limit`
     - Get all Products (paginated)
   - **POST** `/create`
     - Create a product, with given descriptions and stock, and an associated Stripe product
   - **PUT** `/:id`
     - Update Product with given descriptions and stock, and an associated Stripe product by ID
   - **DELETE** `/:id`
     - Delete Product with given descriptions and stock by ID

3. ### Stock:

   `~/product/stock`

   - **DELETE** `/:id`
     - Delete Product Size by ID

4. ### Product Descriptions:

   `~/product/description`

   - **DELETE** `/:id`
     - Delete Product description by ID

5. ### Orders:

   `~/order`

   - **GET** `/:page/:limit`
     - Get all Orders, asscoiated items and stripe session (paginated)
   - **GET** `/:id`
     - Get Order, asscoiated items and stripe session by Id
   - **POST** /lineItems/:limit
     - Get line items for order from stripe session
   - **PUT** `/:id`
     - Update Order by ID
   - **PUT** `/cancel/:id`
     - Cancel Order and refund customer by ID

6. ### Customer Orders:

   `~/customer/order`

   - **GET** `/:page/:limit`
     - Get all User Orders, asscoiated items and stripe session (paginated)
   - **GET** `/:id`
     - Get line items for order from strip session

7. ### Tracking:

   `~/track`

   - **GET** `/:id/:label`
     - Get Tracking status from ShipEngine by ID and Label
   - **GET** `/:id`
     - Get label by ID
   - **POST** `/:usr/:pwd`
     - Tracking Webhook from ShipEngine to update status on the fly

8. ### Checkout:

   `~/checkout`

   - **POST** `/create`
     - Create a Stripe Checkout Session
   - **POST** `/webhook`
     - Webhook exposed to Stripe to get when a customer has completed a checkout session then fulfills the order
   - **Fulfillment Functions**
     - updates inventory, creates an Order, Validates address, and creates a shipment/label

9. ### Cloudinary:
   `~/cloudinary`
   - **GET** `/:publicId`
     - Create a cloudinary signature
