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
    stripePriceId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numItems: {
      type: DataTypes.INTEGER,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
    },
    placement: {
      type: DataTypes.INTEGER,
    },
  });

  return Product;
};
