module.exports = (sequelize, DataTypes) => {
  const ProductStock = sequelize.define("product-stock", {
    size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    numItems: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  return ProductStock;
};
