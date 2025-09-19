"use strict";

export default (sequelize, DataTypes) => {
  const Theme = sequelize.define(
    "Theme",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      occasion_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      category_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      preview_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      preview_video: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      component_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      config: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      base_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      offer_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "INR",
      },
      currency_symbol: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "themes",
      timestamps: true,
      paranoid: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    }
  );

  Theme.associate = (models) => {
    Theme.belongsTo(models.ThemeCategory, {
      foreignKey: "category_id",
      as: "themeCategory",
    });
  };

  return Theme;
};
