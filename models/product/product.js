module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define("product", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
    },
    description_main: {
      type: DataTypes.STRING,
    },
    cost: {
      type: DataTypes.DECIMAL,
    },
    photoUrl: {
      type: DataTypes.STRING,
    },
    stripeProductId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  return Product;
};
