"use strict";

export default (sequelize, DataTypes) => {
  const GuestDirectories = sequelize.define(
    "GuestDirectories",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      group_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      country_code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "guest_directories",
      timestamps: true,
      underscored: true,
      paranoid: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    }
  );

  // 🔹 Define associations here
  GuestDirectories.associate = (models) => {
    GuestDirectories.belongsTo(models.GuestGroups, {
      foreignKey: "group_id",
      as: "group",
    });
  };

  return GuestDirectories;
};
