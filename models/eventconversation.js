"use strict";

export default (sequelize, DataTypes) => {
  const EventConversations = sequelize.define(
    "EventConversations",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      event_wish_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      sender_type: {
        type: DataTypes.ENUM("Guest", "admin"),
        allowNull: false,
      },
      message: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "event_conversations",
      timestamps: true,
      underscored: true,
      paranoid: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    }
  );

  EventConversations.associate = (models) => {
    if (models.event_wishes) {
      EventConversations.belongsTo(models.event_wishes, {
        foreignKey: "event_wish_id",
        as: "wish",
      });
    }
  };

  return EventConversations;
};
