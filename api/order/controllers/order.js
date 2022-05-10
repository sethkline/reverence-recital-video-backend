'use strict';
const stripe = require('stripe')(process.env.STRIPE_SK);
const Analytics = require('analytics-node');
const analytics = new Analytics(process.env.SEGMENT_WRITE_KEY);

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
        await strapi.query('user', 'users-permissions').update({ id: ctx.state.user.id }, { role: findRole.id });
      }
    } catch (error) {
      console.log(error);
      throw error;
    }

    // Send email
    try {
      await strapi.plugins['email'].services.email.send({
        to: ctx.state.user.email,
        from: 'office@reverencestudios.com',
        subject: 'Thanks for signing up for Reverence Recital Video',
        text: `Thank you ${fullName} for signing up to watch online the 2022 Reverence Recital! You have signed up for ${plan[0].name}. Your total paid is $${amount}. Thank you for supporting Reverence Studios.`
      });
    } catch (e) {
      console.log(error);
      throw error;
    }
    // Create User with Segment
    analytics.identify({
      userId: ctx.state.user.id,
      traits: {
        name: fullName,
        email: ctx.state.user.email,
        plan: plan,
        address,
        city,
        postalCode
      }
    });

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
