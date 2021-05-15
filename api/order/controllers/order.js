'use strict';
const stripe = require('stripe')(process.env.STRIPE_SK);
// ('sk_test_Y5wUlhFRBFmajq1nl3YYTC5H');

module.exports = {
  create: async (ctx) => {
    const { address, fullName, amount, plan, postalCode, token, city } = ctx.request.body;

    // TODO check on backend

    // look up plan
    try {
      const serverPlan = await strapi.services.plans.findOne({ id: plan[0].id });
      if (serverPlan.price !== amount) {
        console.warn(`${ctx.state.user.username} ${ctx.state.user.email} User Changed price `);
        return ctx.send({ message: 'Not allowed' }, 403);
      }
    } catch (error) {
      console.log(error);
      throw error;
    }

    // Charge the customer
    try {
      await stripe.charges.create({
        // Transform cents to dollars.
        amount: amount * 100,
        currency: 'usd',
        description: `Order ${new Date()} by ${ctx.state.user.username} ${ctx.state.user.email}`,
        source: token
      });
    } catch (err) {
      console.log(err);
      throw err;
    }

    // Change users role to match type
    try {
      const roles = await strapi.query('role', 'users-permissions').find({}, []);
      let findRole = roles.find((role) => role.name === plan[0].slug);
      if (findRole) {
        let updateUserRole = await strapi
          .query('user', 'users-permissions')
          .update({ id: ctx.state.user.id }, { role: findRole.id });
        console.log(updateUserRole);
      }
    } catch (error) {
      console.log(error);
      throw error;
    }

    // Register the order in the database
    try {
      const order = await strapi.services.order.create({
        user: ctx.state.user.id,
        fullName,
        address,
        amount,
        plan,
        postalCode,
        city
      });
      return order;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
};
